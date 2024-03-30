import { WebSocketServer } from 'ws';
import { spawn } from 'node:child_process';

const botkitUrl = "http://localhost/BotKit/index.php";

const server = new WebSocketServer({port: 7788});
let connected = false;

server.on('connection', function(conn) {

    if (connected == true) {
        // Если уже есть подключение, не принимать ещё больше
        conn.close();
        return;
    }

    connected = true;

    conn.on('error', console.error);

    conn.on('message', async function(msg) {

        // Когда приходит сообщение от тестов, перенаправить его на
        // BotKit, затем вернуть ответ в тесты

        // Но если это запрос на открытие Geany, выполнить его, а не перенаправить
        const data = msg.toString();
        const jsonData = JSON.parse(data);
        
        if (jsonData.action == "geany") {
            spawn(
                "geany",
                [jsonData.file, "+"+jsonData.line]
            );
            return;
        }
        
        const response = await fetch(botkitUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: data
        });

        const botKitResponse = await response.text();

        if (!botKitResponse) {
            // BotKit ничего не вернул -- наверняка из-за ошибки парсинга
            const errorMsg = [{
                action: 'info',
                title: 'Пустой ответ',
                body: 'BotKit выдал пустой ответ для запроса'
            }];
            conn.send(JSON.stringify(errorMsg));
            return;
        }
        
        conn.send(botKitResponse);
    });

    conn.on('close', function() {
        console.log("Client closed connection");
        connected = false;
    });
});

console.log("Ready");