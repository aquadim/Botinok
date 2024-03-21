// Создание контейнера
function getContainer(withID=false) {
    const container = document.createElement("div");
    if (withID) {
        container.id = "msg" + latestMsgId;
    }
    container.classList.add('message-container');
    return container;
}

// Создание карточки
function getCard() {
    const card = document.createElement("div");
    card.classList.add('card');
    return card;
}

// Создание параграфа с текстом
function getParagraph(text) {
    const p = document.createElement("p");
    p.innerHTML = text;
    return p;
}

// Отправка данных в прокси
function proxySend(type, details) {
    const object = {
        type: type,
        details: details
    }
    ws.send(JSON.stringify(object));
}

// Добавление сообщения-информации в список сообщений
function addInfo(title, text) {
    const container = getContainer();
    const card = getCard();

    // Создание текста с информацией
    const header = getParagraph(title);
    header.classList.add('title');
    const body = getParagraph(text);

    // DOM
    card.append(header);
    card.append(body);
    container.append(card);
    msgList.append(container);
    scrollToNew();
}

// Добавление сообщения
function addMessage(text, fromBot, replyTo) {
    const container = getContainer(true);
    
    // Создание сообщения
    const msg = document.createElement("div");
    msg.classList.add('message');
    if (fromBot) {
        msg.classList.add('from-bot');
    }

    // Метаданные

    // id сообщения
    let p = getParagraph("#"+latestMsgId);
    p.classList.add("message-info");
    msg.append(p);

    // Ответ на сообщение
    if (replyTo != -1) {
        p = getParagraph("Ответ на ");
        p.classList.add("message-info");

        let a = document.createElement("a");
        a.href = "#msg"+replyTo;
        a.innerHTML = "сообщение #"+replyTo;
        p.append(a);
        
        msg.append(p);
    }

    const textParagraph = getParagraph(text);
    msg.append(textParagraph);

    // DOM
    container.append(msg);
    msgList.append(container);
    scrollToNew();

    latestMsgId++;
}

// Прокрутка до последнего сообщения
function scrollToNew() {
    msgList.scrollTop = msgList.scrollHeight;
}

// Добавление сообщения об ошибке
function addError(line, file, trace, msg, isError) {
    // Создание контейнера
    const container = getContainer();
    const card = getCard();

    // Если это ошибка - то сделать карточку ошибки, иначе для предупреждения
    let headerText;
    if (isError) {
        card.classList.add('error');
        headerText = "Произошла ошибка";
    } else {
        card.classList.add('warning');
        headerText = "Предупреждение";
    }

    // Заголовок
    const header = getParagraph(headerText);
    header.classList.add('title');

    // Текст ошибки
    const errorMsg = getParagraph(msg);

    // Создание ссылки для открытия ошибки
    const opener = document.createElement("a");
    opener.onclick = function(e) {
        openGeany(this.dataset.file, this.dataset.line);
    }
    opener.href="#";
    opener.dataset.file = file;
    opener.dataset.line = line;
    opener.innerHTML = file+":"+line;

    // Создание отчёта
    const report = document.createElement("pre");
    report.innerHTML = trace;

    // DOM
    card.append(header);
    card.append(errorMsg);
    card.append(opener);
    card.append(report);
    container.append(card);
    msgList.append(container);
    scrollToNew();
}

// Обработка ответа BotKit
// Ответ приходит как массив ответов, поэтому необходимо его обработать
// соответственно
function processMessage(response) {
    r = JSON.parse(response);
    for (let key in r) {
        let action = r[key];

        if (action.action == 'newMessage') {
            addMessage(action.message.text, true, action.message.reply_to);
        } else if (action.action == 'errorMessage') {
            addError(
                action.error.line,
                action.error.file,
                action.error.trace,
                action.error.msg,
                true
            );
        } else if (action.action == 'warningMessage') {
            addError(
                action.error.line,
                action.error.file,
                action.error.trace,
                action.error.msg,
                false
            );
        }
    }
}

// Отправка сообщения
function sendMessage() {
    // Составление объекта исходящено сообщения
    const msgText = msgInput.value;

    // Отправка в прокси
    proxySend("botKitMsg", {id: latestMsgId, text: msgText, userID: userID});

    // Отображение в UI
    addMessage(msgText, false, -1);
    msgInput.value = "";

}

// Отправка запроса на открытие Geany
function openGeany(file, line) {
    const dataObject =
    {
        action: "geany",
        file: file,
        line: line
    }

    // Отправка в прокси
    ws.send(JSON.stringify(dataObject));
}

const msgInput = document.getElementById("userMessage");
const msgList = document.getElementById("msgList");
const sendMsgBtn = document.getElementById("sendMessage");

// ID последнего сообщения в чате
let latestMsgId = 0;

// ID пользователя
let userID = 0;

// Соединение с прокси
const ws = new WebSocket("ws://localhost:7788");

ws.onerror = function(e) {
    addInfo("Ошибка подключения", "Произошла ошибка при подключении к прокси, запусти прокси и перезагрузи страницу");
}

// Получение сообщений от BotKit
ws.onmessage = function(e) {
    processMessage(e.data);
}

sendMsgBtn.onclick = sendMessage;
msgInput.onkeyup = function(e) {
    if (event.key === "Enter") {
        sendMessage();
    }
}