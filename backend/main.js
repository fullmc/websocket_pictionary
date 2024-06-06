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
	// res.json("ip address: http://" + ip.address() + ":" + PORT);
	res.sendFile(path.join(__dirname, "frontend/index.html"));
});

const canvasData = {
	"room-1": [],
	"room-2": [],
};

io.on("connection", (socket) => {
	console.log(`New connection: ${socket.id}`);

	socket.on("join", (room) => {
		const rooms = Array.from(socket.rooms);
		if (rooms.length > 1) {
			// Leave all previous rooms
			rooms.forEach((r) => {
				if (r !== socket.id) {
					// r musn't be the socket.id
					socket.leave(r); // the socket leaves the room r
					io.to(r).emit("user notification", `${socket.id} has left the room`); // send a notification to the room r
				}
			});
		}
		socket.join(room); // the socket joins the room
		io.to(room).emit("user notification", `${socket.id} has joined the room`); // send a notification to the room
		console.log(`${socket.id} joined room: ${room}`);
		socket.emit("canvas data", canvasData[room]); // send the canvas data to the socket
	});

	socket.on("draw", (data) => {
		// data is an object containing the coordinates of the line to draw
		const rooms = Array.from(socket.rooms); // rooms is an array of the rooms the socket is in
		const room = rooms.find((r) => r !== socket.id); // room is the first room the socket is in that is not the socket.id
		if (room) {
			canvasData[room].push(data); // add the data (draw) to the canvas data of the room
			socket.to(room).emit("draw", data); // send the data (draw) to the room (except the socket)
		}
	});

	socket.on("erase", () => {
		const rooms = Array.from(socket.rooms);
		const room = rooms.find((r) => r !== socket.id);
		if (room) {
			canvasData[room] = []; // clear the canvas data of the room
			socket.to(room).emit("erase");
		}
	});

	socket.on("disconnect", () => {
		console.log("Disconnected: " + socket.id);
		socket.broadcast.emit("user notification", `${socket.id} is offline`);
	});
});

server.listen(PORT, () => {
	console.log("Server ip : http://" + ip.address() + ":" + PORT);
});
