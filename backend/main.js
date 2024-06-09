import express from "express";
import http from "http";
import ip from "ip";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

let __dirname = fileURLToPath(import.meta.url);
__dirname = __dirname.substring(0, __dirname.lastIndexOf("/"));

const app = express();
const server = http.createServer(app);
const PORT = 5500;
const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

app.use(express.static(path.join(__dirname, "frontend")));
app.use(cors());
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "frontend/index.html"));
});

const canvasData = {
	"room-1": [],
	"room-2": [],
};

const roomData = {
	"room-1": { drawer: null, users: [], points: {}, currentWord: null },
	"room-2": { drawer: null, users: [], points: {}, currentWord: null },
};

const roomWords = {
	"room-1": ["pomme", "banane", "singe", "canapé", "ordinateur"],
	"room-2": ["apple", "banana", "monkey", "sofa", "computer"],
};

io.on("connection", (socket) => {
	console.log(`New connection: ${socket.id}`);

	socket.on("join", (room) => {
		const rooms = Array.from(socket.rooms);
		if (rooms.length > 1) {
			rooms.forEach((r) => {
				if (r !== socket.id) {
					socket.leave(r);
					io.to(r).emit("user notification", `${socket.id} has left the room`);
					roomData[r].users = roomData[r].users.filter(
						(id) => id !== socket.id
					);
				}
			});
		}
		socket.join(room);
		roomData[room].users.push(socket.id);
		roomData[room].points[socket.id] = 0;
		io.to(room).emit("user notification", `${socket.id} has joined the room`);
		console.log(`${socket.id} joined room: ${room}`);
		socket.emit("canvas data", canvasData[room]);

		// Notify the user of the room they joined
		socket.emit("room info", room);

		// Reassign roles and reset canvas when joining room
		canvasData[room] = [];
		io.to(room).emit("erase"); // Clear canvas for all users in the room
		assignRoles(room);
	});

	socket.on("draw", (data) => {
		const rooms = Array.from(socket.rooms);
		const room = rooms.find((r) => r !== socket.id);
		if (room && roomData[room].drawer === socket.id) {
			canvasData[room].push(data);
			socket.to(room).emit("draw", data);
		}
	});

	socket.on("erase", () => {
		const rooms = Array.from(socket.rooms);
		const room = rooms.find((r) => r !== socket.id);
		if (room && roomData[room].drawer === socket.id) {
			canvasData[room] = [];
			socket.to(room).emit("erase");
		}
	});

	socket.on("submit guess", (guess) => {
		const rooms = Array.from(socket.rooms);
		const room = rooms.find((r) => r !== socket.id);
		if (
			room &&
			roomData[room].currentWord &&
			guess.toLowerCase() === roomData[room].currentWord.toLowerCase()
		) {
			roomData[room].points[socket.id]++;
			io.to(room).emit("user notification", `${socket.id} guessed the word!`);
			io.to(room).emit("update points", roomData[room].points);
			io.to(room).emit("new round"); // Notify the room of the new round
			assignNewWord(room); // Assign a new word without changing roles
		}
	});

	socket.on("disconnect", () => {
		console.log("Disconnected: " + socket.id);
		const rooms = Array.from(socket.rooms);
		rooms.forEach((room) => {
			roomData[room].users = roomData[room].users.filter(
				(id) => id !== socket.id
			);
			if (roomData[room].drawer === socket.id) {
				roomData[room].drawer = null;
				assignRoles(room); // Reassign roles to ensure there is a drawer
			} else {
				updateRoles(room); // Update roles without reassigning drawer
			}
		});
		socket.broadcast.emit("user notification", `${socket.id} is offline`);
	});

	socket.on("play", () => {
		const rooms = Array.from(socket.rooms);
		const room = rooms.find((r) => r !== socket.id);
		if (room) {
			assignRoles(room);
			startSessionTimer(room, 60); // Démarre le minuteur pour une session de 60 secondes
			assignNewWord(room);
			io.to(room).emit("game start");
		}
	});

	function assignRoles(room) {
		const numPlayers = roomData[room].users.length;
		if (numPlayers < 2) {
			// Pas assez de joueurs pour commencer le jeu, informez les joueurs
			io.to(room).emit(
				"user notification",
				"Not enough players to start the game. Need at least two players."
			);
			return; // Sortir de la fonction sans mettre à jour les rôles
		}

		if (
			!roomData[room].drawer ||
			!roomData[room].users.includes(roomData[room].drawer)
		) {
			// Si aucun dessinateur n'est défini ou si le dessinateur actuel n'est plus dans la salle, attribuez-en un nouveau
			const availableUsers = roomData[room].users.filter(
				(id) => id !== roomData[room].drawer
			); // Exclure le dessinateur actuel
			if (availableUsers.length > 0) {
				roomData[room].drawer = availableUsers[0]; // Assigner le premier utilisateur comme dessinateur
			} else {
				// Aucun joueur disponible pour être dessinateur, informez les joueurs de la nécessité de plus de joueurs
				io.to(room).emit(
					"user notification",
					"Not enough players to start the game. Need at least one more player."
				);
				return; // Sortir de la fonction sans mettre à jour les rôles
			}
		}
		updateRoles(room); // Mettre à jour les rôles pour tous les joueurs dans la salle
	}

	function updateRoles(room) {
		roomData[room].users.forEach((id) => {
			if (id === roomData[room].drawer) {
				io.to(id).emit("role", { drawer: id, role: "drawer" });
			} else {
				io.to(id).emit("role", {
					drawer: roomData[room].drawer,
					role: "guesser",
				});
			}
		});
	}

	function assignNewWord(room) {
		const words = roomWords[room];
		const currentWord = roomData[room].currentWord;
		let newWord;
		do {
			newWord = words[Math.floor(Math.random() * words.length)];
		} while (newWord === currentWord);
		roomData[room].currentWord = newWord;
		io.to(roomData[room].drawer).emit("word to draw", newWord);
	}

	function startSessionTimer(room, duration) {
		let timer = duration;
		const interval = setInterval(() => {
			io.to(room).emit("session countdown", timer);
			if (--timer < 0) {
				clearInterval(interval);
				io.to(room).emit("session ended");
			}
		}, 1000);
	}
});

server.listen(PORT, () => {
	console.log("Server ip : http://" + ip.address() + ":" + PORT);
});
