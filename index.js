const net = require('net');
const rp = require('repeatable-promise');

const defaultTimeout = 1500
const defaultclearOut = 0

function Engine(host, port) {

    var client;

    var inDelimiter = /\r\n|\r|\n/
    var outDelimiter = '\n'
    var timeOut = defaultTimeout
    var clearOut = defaultclearOut


    Object.defineProperty(this, 'inDelimiter', {
        set: function (x) {
            inDelimiter = new RegExp(x)
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


    Object.defineProperty(this, 'clearOut', {
        set: function (x) {
            clearOut = isNaN(x) ? defaultClearOut : Math.abs(parseInt(x))
        },
        get: function () { return clearOut; }
    });

    var responseUID = null
    var responseTest = null
    var responseRelease = null
    var responseTimer = null
    var clearWaiter = Promise.resolve()
    const waitClear =
        (clearOut <= 0)
            ? () => { return Promise.resolve() }
            : () => {
                return new Promise((resolve) => {
                    setTimeout(resolve, clearOut)
                })
            }

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
                    clearWaiter = waitClear();
                    let data = chunk.toString()
                    treatment = treatment
                        .then(() => { treat(data) })
                });


                client.on('error', () => { onConnectionError.repeat() });

                client.on('end', () => { onConnectionEnd.repeat() });

            }


            catch (e) {
                onConnectionError.repeat()
                resolve()
            }

        })
    }


    const resetResponse = () => {
        responseUID = reponseTest = null
        if (responseRelease) { responseRelease() }
        clearTimeout(responseTimer)
    }


    var buffer = ""
    var treatment = Promise.resolve()

    const treat = (txt) => {

        onReceive.repeat()
        buffer = buffer + txt;
        var p
        do {
            p = buffer.search(inDelimiter);
            if (p > -1) {
                let sub = buffer.slice(0, p)
                let resp = { text: sub }
                if (responseUID) {
                    resp.UID = responseUID
                    responseTest(sub, () => { resp.end = true; resetResponse() })
                }
                broadcaster.repeat(resp)
                buffer = buffer.slice(p).replace(inDelimiter, "")
            }
        } while (p > -1)
    }


    var broadcaster = new rp.Cycle();
    var receiver = new rp.Cycle();

    const processRequest = (cmd) => {
        //if (cmd.UID) {
        return new Promise((resolve, fail) => {
            responseRelease = resolve
            responseUID = cmd.UID
            responseTest = cmd.test ? cmd.test : () => { return true }
            clearWaiter
                .then(() => {
                    if (responseTest != noRespObj) {
                        responseTimer = setTimeout(() => {
                            onResponseTimeOut.repeat(responseUID);
                            let failresp = responseUID ? { UID: responseUID, fail: true } : { fail: true }
                            broadcaster.repeat(failresp)
                            resetResponse()
                        }, timeOut)
                        client.write(cmd.text + outDelimiter)
                    }
                    else {
                        client.write(cmd.text + outDelimiter)
                        resolve()
                    }
                })
        })
        //}

        //else {
        //    return new Promise((resolve, fail) => {
        //        responseUID = null;
        //        clearWaiter
        //            .then(() => {
        //                client.write(cmd.text + outDelimiter)
        //                resolve()
        //            })

        //    })
        //}
    }

    var listener = receiver.thenAgain((cmd) => {
        sendQueue = sendQueue
            .then(openConnection)
            .then(() => { return processRequest(cmd) })
    })

    var sendQueue = new Promise((resolve) => {
        setTimeout(() => {
            openConnection().then(resolve)
        }
            , 1000)
    })


    this.terminate = () => {
        broadcaster.terminate()
        receiver.terminate()
        onOpenConnectionConnecting.terminate()
        onOpenConnectionSuccess.terminate()
        onOpenConnectionTimeOut.terminate()
        onConnectionError.terminate()
        onConnectionEnd.terminate()
        onReceive.terminate()
        onResponseTimeOut.terminate()
        if (listener) { listener.resolve(); }
        try { client.destroy() }
        catch (e) { }
    }

    this.listen = (f) => {
        return broadcaster.thenAgain(f)
    }

    this.listenString = (f, UID = null) => {
        if (UID == null) {
            return broadcaster.thenAgain((v) => {
                if (! v.fail) { f(v.text) }
            })
        }
        else broadcaster.thenAgain((v) => {
            if (v.UID == UID) {
                if (!v.fail) { f(v.text) }
            }
        })

    }


    this.send = (p) => {
        return receiver.repeat(p)

    }

    this.sendString = (s, UID = null, t = oneLine()) => {
        var p = { text: s, test: t }
        if (UID != null) { p.UID = UID }
        return receiver.repeat(p)
    }

    this.fail = (f, UID = null) => {
        if (UID = null) {
            returnonResponseTimeOut.thenAgain(f)
        }
        else {
            returnonResponseTimeOut.thenAgain(
                (r) => {
                    if (r.UID == UID) {
                        f(r)
                    }
                })
        }

    }

    this.request = (s, f, t = oneLine()) => {
        UID = {}
        var prom = this.listen(
            (p) => {
                if (p.UID == UID) {
                    if (p.fail) {
                        console.debug(prom)
                        prom.reject()
                    }
                    else {
                        if (p.text) {
                            f(p.text)
                        }
                        if (p.end) {
                            prom.resolve()
                        }
                    }
                }

            })
        this.sendString(s, UID, t)
        return prom
    }

}



function untilString(endstring) {
    return (s, f) => {
        if (s.search(endstring) > -1) { f() }
    }
}


function untilRexEx(endRedExp) {
    return (s, f) => {
        if (s.search(endRedExp) > -1) { f() }
    }
}

function untilNumLines(endingN) {
    var obj = {}
    return (s, f) => {
        if (typeof obj.counter == 'undefined') {
            obj.counter = endingN;
        }
        else {
            obj.counter -= 1;
        }
        if (obj.counter <= 0) { f() }
    }
}


function untilMilli(endingT) {
    var obj = {}
    return (s, f) => {
        clearTimeout(obj.timer)
        obj.timer = setTimeout(f, endingT)
    }
}


function oneLine() {
    return (s, f) => { f() }
}

const noRespObj = {} 

function noResponse() {
    return noRespObj
}

function version() {
    return "0.0.4"
}


module.exports = {
    Engine,
    untilString,
    untilRexEx,
    untilNumLines,
    untilMilli,
    oneLine,
    noResponse,
    version
}
