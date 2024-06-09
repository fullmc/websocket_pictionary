import express from "express";
import http from "http";
import ip from "ip";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

let __dirname = fileURLToPath(import.meta.url);
__dirname = __dirname.substring(0, __dirname.lastIndexOf("/")); // Remove the last part of the path

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
	"room-1": { drawer: null, users: [] },
	"room-2": { drawer: null, users: [] },
};

const roomWords = {
	"room-1": ["apple", "banana", "poo", "sofa", "monkey"],
	"room-2": ["fig", "grape", "honeydew", "kiwi", "lemon"],
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

	socket.on("disconnect", () => {
		console.log("Disconnected: " + socket.id);
		const rooms = Array.from(socket.rooms);
		rooms.forEach((room) => {
			roomData[room].users = roomData[room].users.filter(
				(id) => id !== socket.id
			);
			if (roomData[room].drawer === socket.id) {
				roomData[room].drawer = null;
			}
			assignRoles(room);
		});
		socket.broadcast.emit("user notification", `${socket.id} is offline`);
	});

	function assignRoles(room) {
		if (roomData[room].users.length > 0) {
			if (!roomData[room].drawer || roomData[room].users.length === 1) {
				const drawer =
					roomData[room].users[
						Math.floor(Math.random() * roomData[room].users.length)
					];
				roomData[room].drawer = drawer;
			}
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
			io.to(room).emit("countdown", 3); // Start 3 seconds countdown
			setTimeout(() => {
				io.to(room).emit("game start");
			}, 3000);
		}
	}
});

server.listen(PORT, () => {
	console.log("Server ip : http://" + ip.address() + ":" + PORT);
});
