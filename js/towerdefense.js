/* IMPORTANT
 * Movement-Loop-Speed must not be faster than Redirect- and Base-Speed, because otherwise the turning-coordinates may not be hit
 */

var towers = [],
	guides = [],
	routes = [],
	bullets = [],
	enemies = [],
	lastRender = Date.now(),
	currentTower = 0,
	GRIDSIZE = 50,
	ctx = canvas.getContext('2d');

window.onload = function() {
	// Center playground
	canvas.style.top = (window.innerHeight - canvas.height) / 2 + 20 + "px";
	canvas.style.left = (window.innerWidth - canvas.width) / 2 + "px";
	overlay.style.top = (window.innerHeight - canvas.height) / 2 + 20 + "px";
	overlay.style.left = (window.innerWidth - canvas.width) / 2 + "px";
	
	Level.changeTo(1);
	animate();
}

function Guide(d, x, y, h, w) {
	this.size = 50;
	this.dir = d;
	this.top = y;
	this.left = x;
	this.height = h;
	this.width = w;
}

function Route(s, x, y, h, w) {
	this.x = x;
	this.y = y;
	this.height = h;
	this.width = w;
	this.spriteX = s;
}

Level = {
	/* 	[direction, spriteX, x, y, width, height] - directions: 0 = UP, 1 = RIGHT, 2 = DOWN, 3 = LEFT - for guides the spriteX is always 0 because it's not needed there (they don't get drawn)
		if direction == 5, it's a route */
    1: {
		map: [[5, 0, 0, 50, 50, 50], [5, 0, 50, 50, 50, 50], [2, 0, 100, 50, 50, 50], [5, 1, 100, 100, 50, 50], [5, 1, 100, 150, 50, 50], [5, 1, 100, 200, 50, 50], [5, 1, 100, 250, 50, 50],
		 [1, 0, 100, 300, 50, 50], [5, 2, 150, 300, 50, 50], [5, 2, 200, 300, 50, 50], [5, 2, 250, 300, 50, 50], [0, 0, 300, 300, 50, 50], [5, 2, 300, 250, 50, 50], [5, 2, 300, 200, 50, 50],
		 [1, 0, 300, 150, 50, 50], [5, 2, 350, 150, 50, 50], [5, 2, 400, 150, 50, 50], [5, 2, 450, 150, 50, 50], [2, 0, 500, 150, 50, 50], [5, 2, 500, 200, 50, 50], [5, 2, 500, 250, 50, 50],
		 [5, 2, 500, 300, 50, 50], [5, 2, 500, 350, 50, 50], [1, 0, 500, 400, 50, 50], [5, 2, 550, 400, 50, 50], [5, 2, 600, 400, 50, 50], [5, 2, 650, 400, 50, 50], [5, 2, 700, 400, 50, 50],
		 [5, 2, 750, 400, 50, 50], [5, 2, 800, 400, 50, 50], [5, 2, 850, 400, 50, 50], [5, 2, 900, 400, 50, 50], [5, 2, 950, 400, 50, 50], [6, 0, 950, 400, 50, 50]]
    },

    changeTo: function(num) {
		for(var i in this[num].map) {
			if(this[num].map[i][0] < 4) {
				var guide = new Guide(this[num].map[i][0], this[num].map[i][2], this[num].map[i][3], this[num].map[i][4], this[num].map[i][5]);
				guides.push(guide);
			}
			var route = new Route(this[num].map[i][1], this[num].map[i][2], this[num].map[i][3], this[num].map[i][4], this[num].map[i][5]);
			routes.push(route);
		}
    }
}

Wave = {
    currWave: 0,
    maxWave: 1,
    0: [0, 0, 0, 0, 0, 0, 0],
    1: [0, 0, 0, 0, 0, 0, 0, 0]
}

Player = {
    money: 100,
    lifes: 15
}

Tank = {
    x: 0,
    y: 50,
    width: 50,
    height: 50,
    centerX: 25,
    centerY: 75,
    dir: 1,
    hp: 200, // Full HP - never changes
    currhp: 200 // Current HP - changes at hit
}

var towerData = [	{size: 50, range: 100, power: 60, cost: 50},
					{size: 50, range: 150, power: 70, cost: 60}];

var Tower = function(id, x, y, size, range, power) {
	this.img = new Image();
	this.img.src = 'sprites/tower.png';
	this.id = id;
	this.x = x;
	this.y = y;
	this.centerX = x + 25;
	this.centerY = y + 25;
	this.size = size;
	this.range = range;
	this.power = power;
	this.steigung = 0;
	this.cooldown = 1000;
	this.lastShot = 0;
}

var Enemy = function(id) {
	this.img = new Image();
	this.img.src = 'sprites/tanknew.png';
	this.x = 0;
	this.y = 50;
	this.size = 50;
	this.centerX = 25;
	this.centerY = 75;
	this.dir = 1;
	this.hp = 200; // full HP - never changes
	this.currhp = 200; // current hp - changes at hit
	this.bonus = 50; // cash for destroying
}

var Bullet = function(x, y, speedX, speedY, towerID) {
	this.size = 10;
	this.x = x;
	this.y = y;
	this.speed = {x: speedX, y: speedY};
	this.towerID = towerID;
}

function rotateNew(anstieg, enemyID, towerID, enemyCenterX, enemyCenterY) {
    var degree = Math.round(slopeToAngle(anstieg));

    if(enemyCenterY > towers[towerID].centerY && degree < 0) {
		degree = (90 - Math.abs(degree)) + 90;
    }
    else if(enemyCenterY < towers[towerID].centerY && degree > 0) {
		degree = -(90 - degree) - 90;
    }
    var i = towers[towerID].steigung;
    var controlVar = 0;
	var end = (i + 180 > 180) ? -180 + i : i + 180;

    var spin = setInterval(function() {
		if(i != degree) {
			if((degree > i && degree <= i+180) || (i+180 > 180 && (degree > i || degree < -(180-i)))) {
				if(i == 180) {
					i = -180;
				}
				
				i++;
			}
			else {
				if(i == -180) {
					i = 180;
				}
				i--;
			}
			towers[towerID].steigung = i;
		}
		else {
			clearTimeout(spin);
			towers[towerID].steigung = i;
			var xDiff = enemies[enemyID].centerX - towers[towerID].centerX;
			var yDiff = enemies[enemyID].centerY - towers[towerID].centerY;
			var divider = Math.min(Math.abs(xDiff), Math.abs(yDiff));
			bullets.push(new Bullet(towers[towerID].centerX, towers[towerID].centerY, xDiff / divider, yDiff / divider, towerID));
		}
    }, 1);
}

// Steigung in Winkel umrechnen
// dazu erst den arctan der Steigung bilden und anschließend in DEG umrechnen
function slopeToAngle(rad) {
    return Math.atan(rad) * (180/Math.PI);
}

var Redirect = setInterval(function() {
    for(var j in guides) {
		var guide = guides[j];

		for(var i in enemies) {
			var enemy = enemies[i];
			if(enemy.x == guide.left && enemy.y == guide.top) {
				enemy.dir = guide.dir;
			}
		}
    }
}, 10);

function gameOver() {
    overlay.innerHTML = "Game Over!";
}

function displayInfo() {
	//var lifes = document.getElementById("lifes");
	lifes.innerHTML = "";
	for(var i = 0; i < Player.lifes; i++) {
		lifes.innerHTML += "&#9829 ";
	}
	score.innerHTML = Player.money + " €";
}

function initWave(waveid) {
    var i = 0;
    var startWave = setInterval(function() {
		if(i < Wave[waveid].length) {
			var enemy = new Enemy(Wave[waveid][i]);
			enemies.push(enemy);
			i++;
		}
		else {
			clearTimeout(startWave);
		}
    }, 1000);
}

// Mouse events
canvas.onmousedown = function(event) {
    this.xArray = Math.floor((event.pageX - parseInt(canvas.style.left)) / GRIDSIZE) * GRIDSIZE;
    this.yArray = Math.floor((event.pageY - parseInt(canvas.style.top)) / GRIDSIZE) * GRIDSIZE;

    for(var i in towers) {
		var tower = towers[i];
		if(tower.x == this.xArray && tower.y == this.yArray)
			return
    }

    for(var i in routes) {
		var route = routes[i];
		if(route.x == this.xArray && route.y == this.yArray)
			return
    }

    if (Player.money >= towerData[currentTower].cost) {
		var tower = new Tower(towers.length, this.xArray, this.yArray, towerData[currentTower].size, towerData[currentTower].range, towerData[currentTower].power);
		towers.push(tower);
		Player.money -= towerData[currentTower].cost;
    }
}

function animate() {
	var delta = (Date.now() - lastRender) / 1000;
	update(delta);
	draw();
	
	window.requestAnimFrame(animate);
	
	/*if(run && lifes > 0 && blocks.length > 0) {
		// Request a new animation frame using Paul Irish's shim
		window.requestAnimFrame(animate);
	}
	else if(run && lifes > 0) {
		overlay.className = "";
		overlay.innerHTML = "Victory!";
		if(currLevel < Object.keys(level).length) {
			setTimeout(function() {
				currLevel++;
				* overlay.innerHTML = "Level " + currLevel;
				init(currLevel);
			}, 2000);
		}
	}*/
};

function collide(ent1, ent2) {
	return (ent1.x + ent1.size > ent2.x && ent1.x < ent2.x + ent2.size &&
			ent1.y + ent1.size > ent2.y && ent1.y < ent2.y + ent2.size);
}

var update = function() {
	// Towers
    for(var j in towers) {
		var tower = towers[j];
		var w = 0.5 * (Tank.width + tower.range * 2);
		var h = 0.5 * (Tank.height + tower.range * 2);

		for(var i in enemies) {
			var enemy = enemies[i];
			if(Math.abs(enemy.centerX - tower.centerX) <= w && Math.abs(tower.centerY - enemy.centerY) <= h && Date.now() - tower.lastShot > tower.cooldown) {
				tower.lastShot = Date.now();
				var anstieg = (tower.centerY - enemy.centerY) / (tower.centerX - enemy.centerX);
				rotateNew(anstieg, i, j, enemy.centerX, enemy.centerY);
				break;
			}
		}
    }
    
	// Bullets
	for (var b in bullets) {
		var bullet = bullets[b];
		for (var e in enemies) {
			var enemy = enemies[e];
			if (collide(bullet, enemy)) {
				bullets.splice(b, 1);
				enemy.currhp -= towers[bullet.towerID].power;
				if(enemy.currhp <= 0) {
					enemy.currhp = 0;
					enemies.splice(e, 1);
					Player.money += enemy.bonus;
				}

				/*if(enemies.length == 0) {
					clearTimeout(Movement);
					if(Wave.currWave < Wave.maxWave) {
						Wave.currWave++;
						initWave(Wave.currWave);
					}
				}*/
			}
		}
		if (bullet.x > 0 && bullet.x < canvas.width &&
			bullet.y > 0 && bullet.y < canvas.height)
		{
			bullet.x += bullet.speed.x;
			bullet.y += bullet.speed.y;
		}
	}    

	// Enemies
	for(var i in enemies) {
	    var enemy = enemies[i];
	    if(enemy.dir == 0) { // UP
			enemy.y--;
			enemy.centerY--;
	    }
	    else if(enemy.dir == 1) { // RIGHT
			enemy.x++;
			enemy.centerX++;
	    }
	    else if(enemy.dir == 2) { // DOWN
			enemy.y++;
			enemy.centerY++;
	    }
	    else if(enemy.dir == 3) { // LEFT
			enemy.x--;
			enemy.centerX--;
	    }

	    if(enemy.x > canvas.width || enemy.y > canvas.height) {
			enemies.splice(i, 1);
			Player.lifes--;
			if(Player.lifes == 0) {
				gameOver();
			}
			else if(enemies.length == 0) {
				if(Wave.currWave < Wave.maxWave) {
					Wave.currWave++;
					initWave(Wave.currWave);
				}
			}
	    }
	}
}

// Draw
var draw = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(222, 184, 135, 1)'; // burlywood
    ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Level
    for(var index in routes) {
		var route = routes[index];
		ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // orange
		ctx.fillRect(route.x, route.y, route.width, route.height);
    }

	// Enemies
    for(var i in enemies) {
		var enemy = enemies[i];
		ctx.drawImage(enemy.img, enemy.dir * 50, 0, 50, 50, enemy.x, enemy.y, enemy.size, enemy.size);

		ctx.fillStyle = 'red';
		ctx.fillRect(enemy.x, enemy.y+5, enemy.size, 5);

		ctx.fillStyle = 'limegreen';
		ctx.fillRect(enemy.x, enemy.y + 5, (enemy.currhp / enemy.hp) * enemy.size, 5);
    }
    
    // Bullets
    for(var i in bullets) {
		var bullet = bullets[i];
		ctx.fillStyle = "black";
		ctx.beginPath();
		ctx.arc(bullet.x + bullet.size / 2, bullet.y + bullet.size / 2, bullet.size / 2, 0, 2 * Math.PI);
		ctx.fill();
	}

	// Towers
    for(var i in towers) {
		var tower = towers[i];
		ctx.fillStyle = 'green';
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.translate(tower.centerX, tower.centerY);
		ctx.rotate(tower.steigung * Math.PI / 180);
		ctx.drawImage(tower.img, -tower.size / 2, -tower.size / 2, tower.size, tower.size);
		ctx.restore();
    }
    
    displayInfo();
}