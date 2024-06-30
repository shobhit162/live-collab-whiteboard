const socket = io();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let erasing = false;
let username = localStorage.getItem('username') || '';

let current = {
  color: 'black',
  size: 5,
};

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function updateCursorLabel(x, y, user = '') {
  const cursorLabel = document.getElementById('cursorLabel');
  cursorLabel.style.left = `${x}px`;
  cursorLabel.style.top = `${y + 20}px`;
  cursorLabel.textContent = user;
  cursorLabel.style.display = user ? 'block' : 'none';
}

canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  const pos = getMousePos(e);
  current.x = pos.x;
  current.y = pos.y;
  saveState();
});

canvas.addEventListener('mouseup', () => {
  drawing = false;
  socket.emit('stoppedDrawing', { username });
});

canvas.addEventListener('mousemove', (e) => {
  const pos = getMousePos(e);
  if (!drawing) return;
  if (erasing) {
    erase(current.x, current.y, pos.x, pos.y, current.size * 2);
  } else {
    drawLine(current.x, current.y, pos.x, pos.y, current.color, current.size);
  }
  current.x = pos.x;
  current.y = pos.y;

  socket.emit('mousemove', {
    x: pos.x,
    y: pos.y,
    username
  });
});

function drawLine(x0, y0, x1, y1, color, size, emit = true) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.stroke();
  ctx.closePath();

  if (!emit) return;

  socket.emit('drawing', {
    x0, y0, x1, y1, color, size, username
  });
}

function erase(x0, y0, x1, y1, size, emit = true) {
  ctx.clearRect(x1 - size / 2, y1 - size / 2, size, size);

  if (!emit) return;

  socket.emit('erasing', {
    x0, y0, x1, y1, size, username
  });
}

socket.on('drawing', (data) => {
  drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size, false);
  if (data.username !== username) {
    updateCursorLabel(data.x1 + canvas.offsetLeft, data.y1 + canvas.offsetTop, data.username);
  }
});

socket.on('erasing', (data) => {
  erase(data.x0, data.y0, data.x1, data.y1, data.size, false);
  if (data.username !== username) {
    updateCursorLabel(data.x1 + canvas.offsetLeft, data.y1 + canvas.offsetTop, data.username);
  }
});

socket.on('mousemove', (data) => {
  if (data.username !== username) {
    updateCursorLabel(data.x + canvas.offsetLeft, data.y + canvas.offsetTop, data.username);
  }
});

socket.on('stoppedDrawing', (data) => {
  if (data.username !== username) {
    updateCursorLabel(0, 0, '');
  }
});

document.getElementById('color').addEventListener('input', (e) => {
  current.color = e.target.value;
});

document.getElementById('size').addEventListener('input', (e) => {
  current.size = e.target.value;
});

document.getElementById('clear').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit('clear');
  history = [];
  historyIndex = -1;
  localStorage.removeItem('canvasHistory');
});

document.getElementById('eraser').addEventListener('click', () => {
  erasing = !erasing;
  canvas.style.cursor = erasing ? 'url(https://img.icons8.com/?size=100&id=1061&format=png&color=000000) 0 60, auto' : 'crosshair';
});

socket.on('clear', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

let history = [];
let historyIndex = -1;

function saveState() {
  history = history.slice(0, historyIndex + 1);
  history.push(canvas.toDataURL());
  historyIndex++;
  localStorage.setItem('canvasHistory', JSON.stringify(history));
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  let img = new Image();
  img.src = history[historyIndex];
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  localStorage.setItem('canvasHistory', JSON.stringify(history));
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  let img = new Image();
  img.src = history[historyIndex];
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  localStorage.setItem('canvasHistory', JSON.stringify(history));
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    undo();
  } else if (e.ctrlKey && e.key === 'y') {
    redo();
  }
});

document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);

window.addEventListener('load', () => {
  const storedHistory = JSON.parse(localStorage.getItem('canvasHistory'));
  if (storedHistory) {
    history = storedHistory;
    historyIndex = history.length - 1;
    let img = new Image();
    img.src = history[historyIndex];
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
    };
  }
  if (!username) {
    document.getElementById('nameModal').style.display = 'flex';
  } else {
    document.getElementById('nameModal').style.display = 'none';
  }
});

document.getElementById('startDrawing').addEventListener('click', () => {
  username = document.getElementById('username').value.trim();
  if (username) {
    localStorage.setItem('username', username);
    document.getElementById('nameModal').style.display = 'none';
  } else {
    alert('Please enter your name.');
  }
});
