const socket = io("http://localhost:5500");
let currentRoom = null;

socket.on("disconnect", () => {
	console.log("Disconnected");
	notifyUser("You have been disconnected.");
});

socket.on("connect", () => {
	console.log("Connected");
});

socket.on("user notification", (message) => {
	console.log(message);
	notifyUser(message);
});

socket.on("draw", (data) => {
	drawLine(data);
});

socket.on("erase", () => {
	clearCanvas();
});

document.getElementById("erase").addEventListener("click", () => {
	socket.emit("erase");
	clearCanvas();
});

function setup() {
	createCanvas(600, 600);
	background(255); // Ajout d'un fond blanc
	strokeWeight(2); // Définit l'épaisseur du trait
	stroke(0); // Couleur du trait (noir)
}

function draw() {
	if (mouseIsPressed && currentRoom) {
		const data = {
			pmouseX,
			pmouseY,
			mouseX,
			mouseY,
			color: [0, 0, 0], // Couleur noire
			weight: 2, // Épaisseur du trait
			room: currentRoom,
		};
		socket.emit("draw", data);
		drawLine(data);
	}
}

function drawLine({ pmouseX, pmouseY, mouseX, mouseY, color, weight }) {
	stroke(...color);
	strokeWeight(weight);
	line(pmouseX, pmouseY, mouseX, mouseY);
}

function clearCanvas() {
	clear();
	background(255);
}

document.getElementById("room-1").addEventListener("click", () => {
	joinRoom("room-1");
});

document.getElementById("room-2").addEventListener("click", () => {
	joinRoom("room-2");
});

function joinRoom(room) {
	if (currentRoom) {
		socket.emit("leave", currentRoom);
	}
	socket.emit("join", room);
	currentRoom = room;
	clearCanvas(); // Clear canvas when switching rooms
}

function notifyUser(message) {
	const notification = document.createElement("div");
	notification.className = "notification";
	notification.textContent = message;
	document.body.appendChild(notification);
	setTimeout(() => {
		notification.remove();
	}, 3000); // Supprime la notification après 3 secondes
}
