const net = require('net');
const rp = require('repeatable-promise');


function Queue(val) {
    var theQueue = Promise.resolve(val)

    this.enQueue = (f, txt) => {

        if (f instanceof Promise) {
            theQueue = theQueue.then(() => { return f }).catch(() => { })
        }
        else {
            theQueue = theQueue.then(f).catch(() => { })
        }

        return theQueue
    }
}




function Engine(host, port) {

    var client;

    var inDelimiter = /\r\n|\r|\n/
    var inDelimiterChecker = makeEnding(inDelimiter)
    var outDelimiter = '\n'
    var timeOut = 1500
    var clearOut = 0
    var defaultPrompt = /^/
    var modeStrict = true
    var autoLineBreak = false

    function makeEnding(reg) {
        return new RegExp("(" + reg.source + ")$");
    }


    Object.defineProperty(this, 'inDelimiter', {
        set: function (x) {
            inDelimiter = new RegExp(x)
            inDelimiterChecker = makeEnding(inDelimiter)
        },
        get: function () { return inDelimiter; }
    });

    Object.defineProperty(this, 'outDelimiter', {
        set: function (x) {
            outDelimiter = String(x)
        },
        get: function () { return outDelimiter; }
    });

    Object.defineProperty(this, 'timeOut', {
        set: function (x) {
            timeOut = isNaN(x) ? defaultTimeout : Math.abs(parseInt(x))
        },
        get: function () { return timeOut; }
    });




    Object.defineProperty(this, 'defaultPrompt', {
        set: function (x = /^/) {
            defaultPrompt = x
        },
        get: function () { return defaultPrompt; }
    });

    Object.defineProperty(this, 'clearOut', {
        set: function (x) {
            clearOut = isNaN(x) ? defaultClearOut : Math.abs(parseInt(x))
        },
        get: function () { return clearOut; }
    });

    Object.defineProperty(this, 'modeStrict', {
        set: function (x) {
            modeStrict = true && x
            if (!modeStrict) { treat() }
        },
        get: function () { return modeStrict; }
    });

    Object.defineProperty(this, 'autoLineBreak', {
        set: function (x) {
            if (x) { autoLineBreak = Number(x) }
            else { x = false }
        },
        get: function () { return autoLineBreak; }
    });




    onOpenConnectionConnecting = new rp.Cycle();
    onOpenConnectionSuccess = new rp.Cycle();
    onOpenConnectionTimeOut = new rp.Cycle();
    onConnectionError = new rp.Cycle();
    onConnectionEnd = new rp.Cycle();
    onResponseTimeOut = new rp.Cycle();
    onReceive = new rp.Cycle();


    this.onOpenConnectionConnecting = (f) => { return onOpenConnectionConnecting.thenAgain(f) }
    this.onOpenConnectionSuccess = (f) => { return onOpenConnectionSuccess.thenAgain(f) }
    this.onOpenConnectionTimeOut = (f) => { return onOpenConnectionTimeOut.thenAgain(f) }
    this.onConnectionError = (f) => { return onConnectionError.thenAgain(f) }
    this.onConnectionEnd = (f) => { return onConnectionEnd.thenAgain(f) }
    this.onResponseTimeOut = (f) => { return onResponseTimeOut.thenAgain(f) }
    this.onReceive = (f) => { return onReceive.thenAgain(f) }


    var lineBreakTimer = rp.Delay(0)
    lineBreakTimer.clear = true
    const lineBreak = {}

    const openConnection = () => {
        return new Promise((resolve, fail) => {
            try {
                if (client && (!client.pending || client.connecting)) {
                    resolve();
                    return;
                }

                onOpenConnectionConnecting.repeat()

                var timeOutTimer = setTimeout(function () {
                    client.destroy()
                    onOpenConnectionTimeOut.repeat()
                    resolve();
                }, timeOut)

                client = net.createConnection({
                    port: port, host: host
                },
                    function () {
                        clearTimeout(timeOutTimer)
                        onOpenConnectionSuccess.repeat()
                        resolve()
                    }

                )

                client.on('data', function (chunk) {
                    let data = chunk.toString()
                    if (autoLineBreak) {
                        if (inDelimiterChecker.exec(data)) { lineBreakTimer.fail() }
                        else {
                            lineBreakTimer.reset(autoLineBreak)
                            lineBreakTimer = rp.Delay(autoLineBreak)
                            lineBreakTimer
                                .then(() => { treat(outDelimiter) })
                                .catch(() => { })
                                .finally(() => { lineBreakTimer.clear = true })
                        }
                    }

                    treat(data)
                })

                client.on('error', () => { onConnectionError.repeat() });

                client.on('end', () => { onConnectionEnd.repeat() });

            }

            catch (e) {
                onConnectionError.repeat()
                resolve()
            }

        })
    }

    var clearWaiter = rp.Delay(0)
    clearWaiter.clear = true

    function resetClearWaiter() {
        clearWaiter.reset(clearOut)
        if (clearWaiter.clear) {
            clearWaiter = rp.Delay(clearOut)
            clearWaiter.then(() => { clearWaiter.clear = true })
        }
    }

    function sendLine(text) {
        return clearWaiter.then(() => { client.write(text + outDelimiter) })
    }

    var responseExpected = false
    var responseUID = undefined
    var responseTest = undefined
    var responseRelease = undefined
    var responsePrompt = undefined
    var responseFoo = undefined
    var responseTimeout = undefined
    var responseRequest = undefined
    var responseCounter = undefined
    //  var clearWaiter = Promise.resolve()

    var sendQueue = new Queue()
    sendQueue.enQueue(openConnection())


    const send_receive = (text, foo, test, UID, prompt) => {
        var prom = new rp.Defer()

        sendQueue.enQueue(() => {

            openConnection()
                .then(() => { if (text || text == "") { return sendLine(text) } })
                .then(() => {
                    if (test == noRespObj) {
                        prom.resolve();
                        var interResponse = { end: true };
                        if (responseUID) { interResponse.UID = responseUID }
                        if (responseRequest || responseRequest == "") { interResponse.request = responseRequest }
                        broadcast(interResponse)
                        return
                    }
                    responseRequest = text
                    tmpOjt = {}
                    responseTest = (s, f, fd) => { test(s, f, tmpOjt, fd) }
                    responseUID = UID
                    responsePrompt = prompt
                    responseFoo = foo ? foo : () => { }
                    responseRelease = prom
                    responseTimeout = new rp.Delay(timeOut)
                    responseRelease
                        .then(responseTimeout.fail)
                        .catch(() => {
                            var response = { fail: true }
                            if (responseRequest) { response.request = responseRequest }
                            if (UID) { response.UID = UID }
                            broadcast(response)
                        })
                        .finally(() => {
                            responseExpected = false
                            responseUID = undefined
                            responseTest = undefined
                            responseRelease = undefined
                            responsePrompt = undefined
                            responseFoo = undefined
                            responseTimeout = undefined
                            responseCounter = undefined
                            responseRequest = undefined
                        })
                    responseTimeout.then(() => { responseRelease.fail() }).catch(() => { })
                    responseExpected = true
                    treat()
                }, prom.fail)
        })
        sendQueue.enQueue(prom).catch(() => {
            var response = { fail: true }
            if (UID) { response.UID = UID }
            broadcast(response)
        })
        return prom
    }

    var inTreatment = false;
    var buffer = ""

    const treat = (txt) => {
        if (txt) { buffer = buffer + txt, resetClearWaiter() }
        if (inTreatment) { return }
        if (!responseExpected && modeStrict) { return }
        inTreatment = true;
        var requestWIP = true
        onReceive.repeat()
        fEnd = (resp, ) => { requestWIP = false, responseRelease.resolve() }
        do {
            if (responseTimeout) { responseTimeout.reset(timeOut) }
            var pe = inDelimiter.exec(buffer)
            var pr = responsePrompt ? responsePrompt.exec(buffer) : null

            if (pe || pr) {
                var indexStart, indexEnd, promptEnd
                if (pr && (!pe || pr.index <= pe.index)) {
                    indexStart = pr.index + pr[0].length
                    indexEnd = indexStart
                    promptEnd = true
                }
                else {
                    indexStart = pe.index
                    indexEnd = pe.index + pe[0].length
                    promptEnd = false
                }
                let sub = buffer.slice(0, indexStart)
                response = { response: sub }
                if (responseExpected) {
                    responseCounter = responseCounter ? responseCounter + 1 : 1
                    response.count = responseCounter
                    if (responseUID) { response.UID = responseUID }
                    if (responseRequest || responseRequest == "") { response.request = responseRequest }
                    if (responseFoo) { responseFoo(sub) }
                    if (promptEnd) { requestWIP = false, responseRelease.resolve(), response.end = true, response.prompt = true }
                    else {
                        responseTest(sub, () => { requestWIP = false; responseRelease.resolve(); response.end = true },
                            () => {
                                requestWIP = false
                                responseRelease.resolve();
                                var interResponse = { end: true };
                                if (responseUID) { interResponse.UID = responseUID }
                                if (responseRequest || responseRequest == "") { interResponse.request = responseRequest }
                                broadcast(interResponse)
                            })
                    }

                    broadcast(response)
                    buffer = buffer.slice(indexEnd)
                }
            }
        } while (requestWIP && (pe || pr))
        inTreatment = false
    }

    const broadcaster = new rp.Cycle()

    function broadcast(line) {
        broadcaster.repeat(line)
    }


    ////////////--------------------------------------------------------------------------------------------------------
    this.wait = (t) => {
        sendQueue.enQueue(new rp.Delay(t))
    }


    this.terminate = () => {
        sendQueue.enQueue(this.destroy)
    }


    this.destroy = () => {
        broadcaster.terminate()
        onOpenConnectionConnecting.terminate()
        onOpenConnectionSuccess.terminate()
        onOpenConnectionTimeOut.terminate()
        onConnectionError.terminate()
        onConnectionEnd.terminate()
        onReceive.terminate()
        onResponseTimeOut.terminate()
        client.destroy()
    }

    this.request = (req, foo, test = oneLine(), UID) => {
        if (!req || typeof req === 'string' || req instanceof String) {
            return send_receive(req, foo, test, UID, test ? test.prompt : undefined)
        }
        else {
            return send_receive(req.request, req.foo, req.test, req.test ? req.test.prompt : undefined)
        }
    }

    this.listen = (f) => { return broadcaster.thenAgain(f) }

}

function untilString(endstring) {
    return (s, f) => {
        if (endstring.includes(s)) { f() }
    }
}


function untilRegEx(endRegExp) {
    return (s, f) => {
        if (endRegExp.test(s)) { f() }
    }
}



function untilPrompt(promptRegEx) {
    var f = () => { }
    f.prompt = RegExp(promptRegEx)
    return f
}



function untilNumLines(endingN) {

    return (s, f, obj) => {
        if (typeof obj.counter == 'undefined') {
            obj.counter = endingN;
        }
        else {
            obj.counter -= 1;
        }
        if (obj.counter <= 1) { f() }
    }
}


function untilMilli(endingT) {

    return (s, f, obj, fd) => {
        clearTimeout(obj.timer)
        obj.timer = setTimeout(fd, endingT)
    }
}


function oneLine() {
    return (s, f) => { f() }
}

const noRespObj = () => { }

function noResponse() {
    return noRespObj
}


module.exports = {
    Engine,
    untilString,
    untilRegEx,
    untilNumLines,
    untilMilli,
    untilPrompt,
    oneLine,
    noResponse,
}
