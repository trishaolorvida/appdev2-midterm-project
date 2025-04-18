const http = require('http');
const fs = require('fs');
const url = require('url');
const { EventEmitter } = require('events');

const eventEmitter = new EventEmitter();
const PORT = 3000;
const DATA_FILE = 'todos.json';
const LOG_FILE = 'logs.txt';

const logRequest = (method, endpoint) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${method} ${endpoint}\n`;
    fs.appendFile(LOG_FILE, logMessage, (err) => {
        if (err) console.error('Error writing to log file:', err);
    });
};

const readTodos = (callback) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, JSON.parse(data));
        }
    });
};

const writeTodos = (todos, callback) => {
    fs.writeFile(DATA_FILE, JSON.stringify(todos, null, 2), (err) => {
        callback(err);
    });
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;

    logRequest(method, req.url);

    if (method === 'GET' && parsedUrl.pathname === '/todos') {
        readTodos((err, todos) => {
            if (err) {
                res.writeHead(500);
                res.end('Internal Server Error');
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(todos));
            }
        });
    } else if (method === 'GET' && parsedUrl.pathname.startsWith('/todos/')) {
        const id = parseInt(parsedUrl.pathname.split('/')[2]);
        readTodos((err, todos) => {
            if (err || !todos.find(todo => todo.id === id)) {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                const todo = todos.find(todo => todo.id === id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(todo));
            }
        });
    } else if (method === 'POST' && parsedUrl.pathname === '/todos') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const newTodo = JSON.parse(body);
            readTodos((err, todos) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Internal Server Error');
                } else {
                    const id = Math.max(0, ...todos.map((t) => +t.id)) + 1;
                    const todoToAdd = { id, title: newTodo.title, completed: newTodo.completed || false };
                    todos.push(todoToAdd);
                    writeTodos(todos, (err) => {
                        if (err) {
                            res.writeHead(500);
                            res.end('Internal Server Error');
                        } else {
                            res.writeHead(201);
                            res.end(JSON.stringify(todoToAdd));
                        }
                    });
                }
            });
        });
    } else if (method === 'PUT' && parsedUrl.pathname.startsWith('/todos/')) {
        const id = parseInt(parsedUrl.pathname.split('/')[2]);
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const updatedTodo = JSON.parse(body);
            readTodos((err, todos) => {
                if (err || !todos.find(todo => todo.id === id)) {
                    res.writeHead(404);
                    res.end('Not Found');
                } else {
                    const todoIndex = todos.findIndex(todo => todo.id === id);
                    todos[todoIndex] = { ...todos[todoIndex], ...updatedTodo };
                    writeTodos(todos, (err) => {
                        if (err) {
                            res.writeHead(500);
                            res.end('Internal Server Error');
                        } else {
                            res.writeHead(200);
                            res.end(JSON.stringify(todos[todoIndex]));
                        }
                    });
                }
            });
        });
    } else if (method === 'DELETE' && parsedUrl.pathname.startsWith('/todos/')) {
        const id = parseInt(parsedUrl.pathname.split('/')[2]);
        readTodos((err, todos) => {
            if (err || !todos.find(todo => todo.id === id)) {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                const updatedTodos = todos.filter(todo => todo.id !== id);
                writeTodos(updatedTodos, (err) => {
                    if (err) {
                        res.writeHead(500);
                        res.end('Internal Server Error');
                    } else {
                        res.writeHead(204);
                        res.end();
                    }
                });
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});