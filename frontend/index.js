const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ mensagem: 'Frontend Node rodando no Docker!' }));
});

server.listen(3000, () => {
  console.log('Servidor Node rodando na porta 3000');
});