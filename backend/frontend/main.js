const socket = io("http://localhost:5500");
let currentRoom = null;
let role = null;

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

socket.on("canvas data", (data) => {
	data.forEach(drawLine);
});

socket.on("role", ({ drawer, role: assignedRole }) => {
	role = assignedRole;
	if (assignedRole === "drawer") {
		notifyUser("You are the drawer!");
		document.getElementById("guess-input").disabled = false;
		const userRole = document.createElement("div");
		userRole.textContent = "Drawer";
		document.body.appendChild(userRole);
	} else if (assignedRole === "guesser") {
		notifyUser("You are a guesser!");
		const userRole = document.createElement("div");
		userRole.textContent = "Guesser";
		document.body.appendChild(userRole);
	}
	updateUI();
});

socket.on("countdown", (count) => {
	notifyUser(`Game starts in ${count} seconds...`);
});

socket.on("game start", () => {
	if (role === "drawer") {
		enableDrawing();
	} else {
		disableDrawing();
	}
});

socket.on("room info", (room) => {
	notifyUser(`You are in ${room}`);
	currentRoom = room;
});

document.getElementById("erase").addEventListener("click", () => {
	if (role === "drawer") {
		socket.emit("erase");
		clearCanvas();
	}
});

function setup() {
	createCanvas(600, 600);
	background(255); // Ajout d'un fond blanc
	strokeWeight(2); // Définit l'épaisseur du trait
	stroke(0); // Couleur du trait (noir)
	disableDrawing();
}

function draw() {
	if (mouseIsPressed && role === "drawer" && currentRoom) {
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

function updateUI() {
	const eraseButton = document.getElementById("erase");
	const passButton = document.getElementById("pass");
	if (role === "drawer") {
		eraseButton.disabled = false;
		passButton.disabled = false;
	} else {
		eraseButton.disabled = true;
		passButton.disabled = true;
	}
}

function enableDrawing() {
	document.body.style.cursor = "crosshair"; // Change the cursor to a crosshair when drawing
}

function disableDrawing() {
	document.body.style.cursor = "default"; // Change the cursor to default
}
