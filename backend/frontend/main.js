const socket = io("http://localhost:5500");
let currentRoom = null;
let role = null;

socket.on("disconnect", () => {
	console.log("Disconnected");
	notifyUser("You have been disconnected.");
});

socket.on("connect", () => {
	console.log("Connected");
	// Au moment de la connexion, rejoignez une salle
	socket.emit("play");
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
		document.getElementById("user-role").textContent = "You are the drawer!";
		document.getElementById("guess-input").disabled = true;
		document.getElementById("erase").disabled = false;
	} else if (assignedRole === "guesser") {
		document.getElementById("user-role").textContent = "You are a guesser!";
		document.getElementById("guess-input").disabled = false;
		document.getElementById("erase").disabled = true;
	}
});

socket.on("session countdown", (count) => {
	const countdown = document.getElementById("countdown");
	const minutes = Math.floor(count / 60);
	const seconds = count % 60;
	countdown.style.display = "block";
	countdown.textContent = `Session time left: ${minutes}:${
		seconds < 10 ? "0" + seconds : seconds
	}`;
});

socket.on("session ended", () => {
	disableDrawing();
	notifyUser("Session ended!");
	document.getElementById("guess-input").disabled = true;
	// Effectuez toute action nécessaire à la fin de la session
});

socket.on("game start", () => {
	if (role === "drawer") {
		enableDrawing();
	} else {
		disableDrawing();
	}
	// Arrête le minuteur de session une fois le jeu commencé
	clearInterval(sessionTimerInterval);
	// Autres actions à exécuter au début du jeu
});

socket.on("room info", (room) => {
	notifyUser(`You are in ${room}`);
	currentRoom = room;
});

socket.on("update points", (points) => {
	updatePoints(points);
});

socket.on("word to draw", (word) => {
	if (role === "drawer") {
		document.getElementById("word-to-draw").textContent = `Draw a ${word}`;
	}
});

document.getElementById("erase").addEventListener("click", () => {
	if (role === "drawer") {
		socket.emit("erase");
		clearCanvas();
	}
});

document.getElementById("guess-input").addEventListener("keypress", (e) => {
	if (e.key === "Enter" && role === "guesser") {
		const guess = e.target.value;
		socket.emit("submit guess", guess);
		e.target.value = "";
	}
});

document.getElementById("play").addEventListener("click", () => {
	if (currentRoom) {
		socket.emit("play");
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
	stroke(color);
	strokeWeight(weight);
	line(pmouseX, pmouseY, mouseX, mouseY);
}

function clearCanvas() {
	background(255); // Repeint le canvas en blanc
}

function disableDrawing() {
	noLoop(); // Désactive la boucle draw
}

function enableDrawing() {
	loop(); // Réactive la boucle draw
}

function notifyUser(message) {
	const notification = document.getElementById("notification");
	if ((notification.textContent = message)) {
		notification.style.display = "block";
		notification.style.padding = "10px";
		setTimeout(() => {
			notification.textContent = "";
			notification.style.display = "none";
		}, 5000);
	}
}

function updatePoints(points) {
	const pointsContainer = document.getElementById("points");
	pointsContainer.innerHTML = ""; // Efface le contenu précédent
	for (const [id, point] of Object.entries(points)) {
		const pointEntry = document.createElement("div");
		pointEntry.textContent = `User ${id}: ${point} points`;
		pointsContainer.appendChild(pointEntry);
	}
}

// Sample room join for testing purposes
document.getElementById("room-1").addEventListener("click", () => {
	socket.emit("join", "room-1");
});

document.getElementById("room-2").addEventListener("click", () => {
	socket.emit("join", "room-2");
});

document.getElementById("quit").addEventListener("click", () => {
	if (currentRoom) {
		socket.emit("leave", currentRoom);
		notifyUser("You have left the room.");
		clearCanvas();
		document.getElementById("countdown").textContent = "";
		document.getElementById("user-role").textContent = "";
		document.getElementById("guess-input").disabled = true;
		document.getElementById("erase").disabled = true;

		role = null;
		currentRoom = null;
	}
});
