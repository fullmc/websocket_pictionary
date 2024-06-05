import express from "express";
import http from "http";
import ip from "ip";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const PORT = 5500;
const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

app.use(cors());
app.get("/", (req, res) => {
	res.json("ip address: http://" + ip.address() + ":" + PORT);
});

const words = ["cat", "dog", "house", "tree", "car"]; // Liste de mots
let currentWord = null;
let currentDrawer = null;
let timer = null;
const roundTime = 60; // Temps imparti en secondes

io.on("connection", (socket) => {
	console.log(`New connection: ${socket.id}`);

	socket.on("start game", () => {
		if (!currentDrawer) {
			startNewRound();
		}
	});

	socket.on("draw", (data) => {
		socket.broadcast.emit("draw", data);
	});

	socket.on("erase", () => {
		socket.broadcast.emit("erase");
	});

	socket.on("guess", (guess) => {
		if (guess.toLowerCase() === currentWord) {
			socket.emit("correct guess");
			io.emit("message", `${socket.id} guessed the word!`);
			startNewRound();
		}
	});

	socket.on("disconnect", () => {
		console.log(`User disconnected: ${socket.id}`);
		if (socket.id === currentDrawer) {
			clearTimeout(timer);
			startNewRound();
		}
		socket.broadcast.emit(
			"user notification",
			`User disconnected: ${socket.id}`
		);
	});
});

function startNewRound() {
	const clients = Array.from(io.sockets.sockets.keys());
	if (clients.length === 0) return;

	currentDrawer = clients[Math.floor(Math.random() * clients.length)];
	currentWord = words[Math.floor(Math.random() * words.length)];
	io.to(currentDrawer).emit("your turn", currentWord);
	io.emit("message", `It's ${currentDrawer}'s turn to draw!`);

	timer = setTimeout(() => {
		io.emit("message", "Time's up!");
		startNewRound();
	}, roundTime * 1000);
}

server.listen(PORT, () => {
	console.log("Server ip : http://" + ip.address() + ":" + PORT);
});
