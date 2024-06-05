const socket = io("http://localhost:5500");

socket.on("disconnect", () => {
	console.log("Disconnected");
});

socket.on("connect", () => {
	console.log("Connected");
});

socket.on("user disconnected", () => {
	console.log("User disconnected");
});

socket.on("draw", (data) => {
	drawLine(data);
});

// document.getElementById("erase").addEventListener("click", () => {
// 	document.querySelector("canvas").getContext("2d").clearRect(0, 0, 600, 600); // Efface le contenu du canvas
// });
document.getElementById("erase").addEventListener("click", () => {
	const ctx = document.querySelector("canvas").getContext("2d");
	ctx.clearRect(0, 0, 600, 600); // Efface le contenu du canvas
	socket.emit("erase");
});

function setup() {
	createCanvas(600, 600);
	background(255); // Ajout d'un fond blanc
	strokeWeight(2); // Définit l'épaisseur du trait
	stroke(0); // Couleur du trait (noir)
}

function draw() {
	if (mouseIsPressed) {
		const data = {
			pmouseX,
			pmouseY,
			mouseX,
			mouseY,
			color: [0, 0, 0], // Couleur noire
			weight: 2, // Épaisseur du trait
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
