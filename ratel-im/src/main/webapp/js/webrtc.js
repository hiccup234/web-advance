// 1、显示加载框
loading();

/**
 * 动态改变视频窗口大小
 */
function bodyOnResize() {
    var bodyHeight = document.body.clientHeight;
    var containerHeiht = window.document.getElementById('container').offsetHeight;
    document.getElementById("room").style.height = bodyHeight + "px";
}

/**
 * 初始化
 */
function initialize() {
    bodyOnResize();
    var room = document.getElementById("room");
    var localVideo = document.getElementById("localVideo");
    var remoteVideo = document.getElementById("remoteVideo");
    remoteVideo.style.opacity = 1;
    localVideo.style.opacity = 1;
}

setTimeout(initialize, 1);

/**
 * 进入全屏
 */
function enterFullScreen() {
    var element = document.getElementById('container');
    if (element.requestFullScreen) {
        element.requestFullScreen();
    } else if (element.webkitRequestFullScreen) {
        element.webkitRequestFullScreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    }
}

/**
 * 获取url参数
 * @param {Object} name
 * @return {TypeName}
 */
function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r != null)
        return unescape(r[2]);
    return null;
}

/**
 * WebRTC兼容浏览器
 */
var PeerConnection = (window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
var URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
// var getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
var RTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
var RTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription);
navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

// stun和turn服务器
var iceServer = {
    "iceServers": [
        {"url": "stun:stun.voxgratia.org"},
//		{"url" : "stun:stun.ideasip.com" },
        {
            "url": "turn:numb.viagenie.ca",
            "username": "webrtc@live.com",
            "credential": "muazkh"
        }]
};

// 创建PeerConnection实例 (参数为null则没有iceserver，即使没有stunserver和turnserver，仍可在局域网下通讯)
var answerPeerConnection = new PeerConnection(iceServer);

var offerPeerConnection = new PeerConnection(iceServer);


function getToken() {
    return Math.round(Math.random() * 9999999999) + 9999999999;
}

var acct = "hiccup" + getToken();

// var wsHost = "ws://127.0.0.1:8234/im/";
var wsHost = "ws://hiccup.top:8234/im/";
var socket = new WebSocket(wsHost);

// 发送ICE候选到其他客户端
answerPeerConnection.onicecandidate = function (event) {
    if (event.candidate !== null) {
        socket.send(JSON.stringify({
            "acct": acct,
            "type": "_ice_answer",
            "event": "_ice_candidate",
            "data": {
                "candidate": event.candidate
            }
        }));
    }
};

offerPeerConnection.onicecandidate = function (event) {
    if (event.candidate !== null) {
        socket.send(JSON.stringify({
            "acct": acct,
            "type": "_ice_offer",
            "event": "_ice_candidate",
            "data": {
                "candidate": event.candidate
            }
        }));
    }
};

// 如果检测到媒体流连接到本地，将其绑定到一个video标签上输出
answerPeerConnection.onaddstream = function (event) {
    closeLoading();
    document.getElementById('remoteVideo').src = URL.createObjectURL(event.stream);
};

offerPeerConnection.onaddstream = function (event) {
    closeLoading();
    document.getElementById('remoteVideo').src = URL.createObjectURL(event.stream);
};

// 发送answer的函数，发送本地session描述
var sendAnswerFn = function (desc) {
    answerPeerConnection.setLocalDescription(desc);
    socket.send(JSON.stringify({
        "acct": acct,
        "event": "_answer",
        "data": {
            "sdp": desc
        }
    }));
};

// 发送offer的函数，发送本地session描述
var sendOfferFn = function (desc) {
    offerPeerConnection.setLocalDescription(desc);
    socket.send(JSON.stringify({
        "acct": acct,
        "event": "_offer",
        "data": {
            "sdp": desc
        }
    }));
};

// 获取本地音频和视频流
navigator.getMedia({
    "audio": true,
    "video": true
}, function (stream) {
    //绑定本地媒体流到video标签用于输出
    document.getElementById('localVideo').src = URL.createObjectURL(stream);
    //静音处理
    document.getElementById('localVideo').muted = true;
    //向PeerConnection中加入需要发送的流
    answerPeerConnection.addStream(stream);
    offerPeerConnection.addStream(stream);
    $("#tips-content").html("正在连接，请等待..");

    //发送一个offer信令,如果有回应，则作为发起方；否则，是应答方
    offerPeerConnection.createOffer(sendOfferFn, function (error) {
        console.log('Failure callback: ' + error);
    });

}, function (error) {
    alert("获取不到媒体流，请确认视频设备");
    $("#tips-content").html("获取不到媒体流，请确认视频设备");
    //处理媒体流创建失败错误
    console.log('getUserMedia error: ' + error);
});

// 处理服务器下发的消息
socket.onmessage = function (event) {
    var json = JSON.parse(event.data);
    // 如果是一个ICE的候选，则将其加入到PeerConnection中，否则设定对方的session描述为传递过来的描述
    if (json.event == "_ice_candidate") {
        if (json.acct != acct) {
            if (json.type == "_ice_offer") {
                answerPeerConnection.addIceCandidate(new RTCIceCandidate(
                    json.data.candidate));
            }
            if (json.type == "_ice_answer") {
                offerPeerConnection.addIceCandidate(new RTCIceCandidate(
                    json.data.candidate));
            }
        }
    } else if (json.message === "websocket open!") {
        console.log("open!");
    } else {
        if (json.acct != acct) {
            answerPeerConnection
                .setRemoteDescription(new RTCSessionDescription(json.data.sdp));
            offerPeerConnection.setRemoteDescription(new RTCSessionDescription(json.data.sdp));
            // 如果是一个offer，那么需要回复一个answer
            if (json.event === "_offer") {
                answerPeerConnection.createAnswer(sendAnswerFn,
                    function (error) {
                        console.log('Failure callback: ' + error);
                    });
            }
        }

    }
};


/**
 * 加载提示
 */
function loading() {
    $('#my-modal-loading').modal({
        relatedElement: this,
        cancelable: false
    });
}

/**
 * 关闭加载提示
 */
function closeLoading() {
    $('#my-modal-loading').modal("close")
}
