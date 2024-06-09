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
			io.to(room).emit("countdown", 3); // Start 3 seconds countdown
			setTimeout(() => {
				assignNewWord(room);
				io.to(room).emit("game start");
			}, 3000);
		}
	});

	function assignRoles(room) {
		if (roomData[room].users.length > 0) {
			if (!roomData[room].drawer) {
				roomData[room].drawer = roomData[room].users[0];
			}
			updateRoles(room);
		}
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
});

server.listen(PORT, () => {
	console.log("Server ip : http://" + ip.address() + ":" + PORT);
});
