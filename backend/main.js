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

io.on("connection", (socket) => {
	console.log(`New connection: ${socket.id}`);

	// afficher l'user connecté
	socket.broadcast.emit("user notification", `${socket.id} is online`);

	socket.on("erase", () => {
		socket.broadcast.emit("erase");
	});

	socket.on("join", (room) => {
		const rooms = Array.from(socket.rooms);
		if (rooms.length > 1) {
			// Leave all previous rooms
			rooms.forEach((r) => {
				if (r !== socket.id) {
					socket.leave(r);
					io.to(r).emit("user notification", `${socket.id} has left the room`);
				}
			});
		}
		socket.join(room);
		io.to(room).emit(
			"user notification",
			`${socket.id} has joined the ${room}`
		);
		console.log(`${socket.id} joined room: ${room}`);
	});

	socket.on("leave", (room) => {
		socket.leave(room);
		io.to(room).emit("user notification", `${socket.id} has left the ${room}`);
		console.log(`${socket.id} left room: ${room}`);
	});

	socket.on("disconnect", () => {
		console.log("Disconnected: " + socket.id);
		socket.broadcast.emit("user notification", `${socket.id} is offline`);
	});
});

// function startNewRound() {
// 	const clients = Array.from(io.sockets.sockets.keys());
// 	if (clients.length === 0) return;

// 	currentDrawer = clients[Math.floor(Math.random() * clients.length)];
// 	currentWord = words[Math.floor(Math.random() * words.length)];
// 	io.to(currentDrawer).emit("your turn", currentWord);
// 	io.emit("message", `It's ${currentDrawer}'s turn to draw!`);

// 	timer = setTimeout(() => {
// 		io.emit("message", "Time's up!");
// 		startNewRound();
// 	}, roundTime * 1000);
// }

server.listen(PORT, () => {
	console.log("Server ip : http://" + ip.address() + ":" + PORT);
});
