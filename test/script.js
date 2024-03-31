// избежание HTML символов
// http://stackoverflow.com/questions/6234773/ddg#6234804
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
 }

// Создание контейнера
function getContainer(withID=false) {
    const container = document.createElement("div");
    if (withID) {
        container.id = "msg" + latestMsgId;
    }
    container.classList.add('message-container');
    return container;
}

// Функция удаления карточки
function closeButtonCallback(e) {
    this.closest('.message-container').remove();
}

// Создание карточки
function getCard() {
    const card = document.createElement("div");
    card.classList.add('card');
    card.onclick = function (e) {
        if (e && (e.which == 2 || e.button == 4 )) {
            closeButtonCallback();
        }
    }

    const closeButton = document.createElement("a");
    closeButton.href = "#";
    closeButton.innerHTML = "&times;";
    closeButton.classList.add('close-button');
    closeButton.onclick = closeButtonCallback;
    card.append(closeButton);

    return card;
}

// Создание параграфа с текстом
function getParagraph(text) {
    const p = document.createElement("p");
    p.innerHTML = escapeHtml(text);
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
function addInfo(title, text, bodyElement = 'p') {
    const container = getContainer();
    const card = getCard();

    // Создание текста с информацией
    const header = getParagraph(title);
    header.classList.add('title');
    const body = document.createElement(bodyElement);
    body.innerHTML = escapeHtml(text);

    // DOM
    card.append(header);
    card.append(body);
    container.append(card);
    msgList.append(container);
    scrollToNew();
}

// Возвращает DOM объект клавиатуры
function getKeyboardObject(layout, buttonCallback) {
    const keyboardDom = document.createElement('div');
    keyboardDom.classList.add('keyboard');

    for (let rowIndex in layout) {
        const rowObj = layout[rowIndex];
        const rowDom = document.createElement("div");
        rowDom.classList.add('keyboard-row');
        
        for (let buttonIndex in rowObj) {
            const buttonObj = rowObj[buttonIndex];
            const buttonDom = document.createElement('button');
            const currentMsgId = latestMsgId;
            buttonDom.classList.add('btn');
            buttonDom.innerHTML = escapeHtml(buttonObj.label);
            buttonDom.onclick = function(e) {
                buttonCallback(buttonObj, currentMsgId);
            }
            rowDom.append(buttonDom);
        }
        keyboardDom.append(rowDom);
    }
    return keyboardDom;
}

// Возвращает DOM объект сообщения
function getMessageObject(
    text,
    fromBot,
    replyTo,
    attachments,
    msgId,
    edited) {

    const msg = document.createElement("div");
    msg.classList.add('message');
    if (fromBot) {
        msg.classList.add('from-bot');
    }

    // id сообщения
    let p = getParagraph("#"+msgId);
    p.classList.add("message-info");
    msg.append(p);

    // Пометка "Изменено"
    if (edited) {
        p = getParagraph("Изменено");
        p.classList.add("message-info");
        msg.append(p);
    }

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

    // Текст
    const lines = text.split('\n');
    let textParagraph;
    for (index in lines) {
        textParagraph = getParagraph(lines[index]);
        msg.append(textParagraph);
    }

    // Вложения
    const keyboards = [];
    const images = [];
    
    for (let attachment in attachments) {
        const item = attachments[attachment];
        switch (item.type) {
            case 'inlineKeyboard':
                // Встраиваемая клавиатура
                // При нажатии на кнопку из этой клавиатуры будет отсылаться
                // событие обратного вызова с параметрами кнопки
                const keyboardDom = getKeyboardObject(
                    item.layout,
                    function(buttonObj, currentMsgId) {
                        proxySend(
                            'callback',
                            {
                                params: buttonObj.payload,
                                msgId: currentMsgId,
                                userId: userID,
                                callbackType: buttonObj.callbackType
                            }
                        );
                    }
                );
                keyboards.push(keyboardDom);
                break;

            case 'image':
                // Изображение
                const imgDom = document.createElement('img');
                imgDom.src = item.url;
                images.push(imgDom);
                break;

            case 'keyboard':
                // Обычная клавиатура

                // 1. Убрать прошлую клавиатуру
                plainkeyboard.innerHTML = "";

                // 2. Создать новую
                // При нажатии на любую кнопку клавиатуры будет отсылаться
                // сообщение с текстом, взятым из текста кнопки
                const keyboardDomPlain = getKeyboardObject(
                    item.layout,
                    function(buttonObj, currentMsgId) {
                        sendMessage(buttonObj.label);
                    }
                );

                // 3. Добавить клавиатуру
                plainkeyboard.append(keyboardDomPlain);

                // 4. Раскрыть
                openKeyboard();
                
            default:
                break;
        }
    }

    // Сначала изображения
    for (imageIndex in images) {
        msg.append(images[imageIndex]);
    }

    // Затем клавиатура
    for (keyboardIndex in keyboards) {
        msg.append(keyboards[keyboardIndex]);
    }

    return msg;
}

// Добавление сообщения
function addMessage(text, fromBot, replyTo, attachments) {
    const container = getContainer(true);
    
    // Создание сообщения
    const msg = getMessageObject(
        text,
        fromBot,
        replyTo,
        attachments,
        latestMsgId,
        false
    );
    
    // DOM
    container.append(msg);
    msgList.append(container);
    scrollToNew();

    latestMsgId++;
}

// Изменение сообщения
function editMessage(text, attachments, msgId) {
    const msg = getMessageObject(
        text,
        true,
        -1,
        attachments,
        msgId,
        true
    );
    const container = document.getElementById('msg' + msgId);
    container.replaceChild(msg, container.firstElementChild);
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
    opener.innerHTML = escapeHtml(file+":"+line);

    // Создание отчёта
    const report = document.createElement("pre");
    report.innerHTML = escapeHtml(trace);

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
            addMessage(
                action.message.text,
                true,
                action.message.reply_to,
                action.message.attachments
            );
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
        } else if (action.action == 'varDump') {
            addInfo("Содержимое для "+action.title, action.info, 'pre');
        } else if (action.action == 'info') {
            addInfo(action.title, action.body, 'p');
        } else if (action.action == 'editMessage') {
            // Изменение сообщения
            editMessage(
                action.newMessage.text,
                action.newMessage.attachments,
                action.messageId
            )
        } else {
            addInfo("Получено неизвестное действие", action.action, 'p');
        }
    }
}

// Отправка сообщения
function sendMessage(msgText) {
    // Составление объекта исходящено сообщения

    // Отправка в прокси
    proxySend("botKitMsg", {id: latestMsgId, text: msgText, userID: userID});

    // Отображение в UI
    addMessage(msgText, false, -1, []);
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

// Закрывает клавиатуру
function closeKeyboard() {
    keyboard.style.display = 'none';
    keyboardHide.style.display = 'none';
    keyboardShow.style.display = 'block';
    keyboardVisible = false;
}
// Открывает клавиатуру
function openKeyboard() {
    keyboard.style.display = 'block';
    keyboardHide.style.display = 'block';
    keyboardShow.style.display = 'none';
    keyboardVisible = true;
}

const msgInput = document.getElementById("userMessage");
const msgList = document.getElementById("msgList");
const sendMsgBtn = document.getElementById("sendMessage");
const toggleKeyboardBtn = document.getElementById("toggleKeyboard");
const keyboard = document.getElementById("plainkeyboard");
const keyboardShow = document.getElementById("keyboardShow");
const keyboardHide = document.getElementById("keyboardHide");
let keyboardVisible = false;

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

sendMsgBtn.onclick = function(e) {
    sendMessage(msgInput.value);
};
msgInput.onkeyup = function(e) {
    if (event.key === "Enter") {
        sendMessage(this.value);
    }
}

// Нажатия на клавиатуру
document.addEventListener("click", function(e) {
    const element = e.target;
    if (element.tagName.toUpperCase() == 'BUTTON') {

        if (element.classList.contains("under-keyboard")) {
            sendMessage(element.innerHTML);
        }
    }
});

// Нажатия на кнопку раскрытия/закрытия клавиатуры
toggleKeyboardBtn.onclick = function(e) {
    if (keyboardVisible) {
        closeKeyboard();
    } else {
        openKeyboard();
    }
}