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

	// Écoute des événements de dessin
	socket.on("draw", (data) => {
		// Émet les données de dessin à tous les autres clients
		socket.broadcast.emit("draw", data);
	});

	// Écoute des événements d'effacement
	socket.on("erase", () => {
		// Émet l'événement d'effacement à tous les autres clients
		socket.broadcast.emit("erase");
	});

	socket.on("disconnect", () => {
		console.log(`User disconnected: ${socket.id}`);
	});
});

server.listen(PORT, () => {
	console.log("Server ip : http://" + ip.address() + ":" + PORT);
});
