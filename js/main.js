let isScrobbling = false;
let token;
let apiKey = "805f4dc7ddd24b14107153941452f0f0"//"797ffeff33536c957e09ef975c4cc2b9";
let apiSecret = "fbc3943488b9c8a804675a99aeca33ba"//"27cf32c837522842aa82a6c3bb6b869f";
let apiSig;
let userKey = localStorage.getItem("lastFmSessionKey");
let tracksScrobbled = new Map();
let fullArtistDescription;
let currentTrackData;
let tracksScrobbledTable;

$(function () {
    // init block
    $('[data-toggle="tooltip"]').tooltip();
    
    if (userKey) {
        isScrobbling = true;
        $("#lastFmDropDown").html(localStorage.getItem("lastFmUsername") + "(scrobbling)");
    }
})

//let volumeSlider = $('#ex1').slider({
//    formatter: function (value) {
//        return 'Current value: ' + value;
//    }
//});
//volumeSlider.on("slide", function (value) {
//    document.getElementById("audioControl").volume = volumeSlider[0].value;
//});

$('#playPauseButton').click(function () {
    if (isRadioPlaying()) {
        audioControl.play();
        $("#playPauseButton i").attr("class", "fa fa-pause");
    } else {
        audioControl.pause();
        $("#playPauseButton i").attr("class", "fa fa-play");
    }
});
$('#login-submit').click(function () {
    let lastFmUsername = $("#username").val();
    localStorage.setItem("lastFmUsername", lastFmUsername);
    
    if (!userKey) {
        getLastFmToken();
    }
    
    $("#username-form").hide();
    $('#logout').show();
});
$('#logout').click(function () {
    isScrobbling = false;
    userKey = undefined;
    
    $("#username-form").show();
    $('#logout').hide();
    localStorage.removeItem("lastFmUsername");
    $("#lastFmDropDown").html("Log In");
});

function isRadioPlaying() {
    return $("#playPauseButton i").hasClass("fa-play");
}

let scrobbledTracksArray = localStorage.getItem("scrobbledTracksArray") || "[]";
localStorage.setItem("scrobbledTracksArray", scrobbledTracksArray);

tracksScrobbledTable = $("#tracksScrobbled").DataTable({
    columns: [
        {
            data: [0]
        },
        {
            data: [1]
        },
        {
            data: [2]
        },
        {
            data: [3],
            render: function (data, type, row) {
                return formatDate(new Date(data));
            }
        },
        {
            data: [4],
            render: function (data, type, row) {
                let trackLovedHtml = "<button class='btn btn-success btn-sm' data-toggle='tooltip' data-placement='top' title='Loved on LastFM'><i class='fa fa-heart'></i></button>";
                let trackNotLovedHtml = "<button class='btn btn-danger btn-sm' data-toggle='tooltip' data-placement='top' title='Not loved on LastFM'><i class='fa fa-heart'></i></button>";
                return trackNotLovedHtml;
            }
        }
                ],
    "order": [[3, "desc"]]
});

JSON.parse(scrobbledTracksArray).forEach(function (trackInfo) {
    tracksScrobbled.set(trackInfo.airDate, trackInfo);
    tracksScrobbledTable.row.add([
                    trackInfo.artist,
                    trackInfo.trackName,
                    trackInfo.releaseDate,
                    trackInfo.airDate,
                    trackInfo.tags
                ]);
    tracksScrobbledTable.draw();
});

$('#tracksScrobbled tbody').on('click', 'button', function () {
    let data = tracksScrobbledTable.row($(this).parents('tr')).data();
    let button = $(this);
    let isLoveTrack = button.hasClass("btn-danger");

    let method = "love";
    if (!isLoveTrack) {
        method = "unlove";
    }

    let stringBeforeHash = "api_key" + apiKey +
        "artist" + data[0].trim() +
        "methodtrack." + method +
        "sk" + userKey +
        "track" + data[1].trim() +
        apiSecret;
    let hash = md5(stringBeforeHash);

    let scrobbleData = 'method=track.' + method + '&' +
        'artist=' + encodeURIComponent(data[0].trim()) + '&' +
        'track=' + encodeURIComponent(data[1].trim()) + '&' +
        'api_key=' + apiKey + '&' +
        'api_sig=' + hash + '&' +
        'sk=' + userKey;

    $.ajax({
        type: 'POST',
        url: 'http://ws.audioscrobbler.com/2.0/',
        data: scrobbleData,
        success: function (data) {
            console.log("success love")

            if (isLoveTrack) {
                button.attr("class", "btn btn-success btn-sm");
            } else {
                button.attr("class", "btn btn-danger btn-sm");
            }
        },
        error: function (code, message) {
            console.log(code);
            console.log(message);
            console.log('Error love');
        }
    });
});


getCurrentTrack();
setInterval(function () {
    getCurrentTrack();
}, 10000)


$("body").on("click", "#readMore", function () {
    if ($("#artistInfo").text().length > 550) {
        $("#artistInfo").html(fullArtistDescription.substring(0, 500) + " <a href='#' id='readMore'>Read More...</a>");
    } else {
        $("#artistInfo").html(fullArtistDescription + " <a href='#' id='readMore'>(hide)</a>");
    }
})

function formatDate(d) {
    return ("00" + (d.getMonth() + 1)).slice(-2) + "/" +
        ("00" + d.getDate()).slice(-2) + "/" +
        d.getFullYear() + " " +
        ("00" + d.getHours()).slice(-2) + ":" +
        ("00" + d.getMinutes()).slice(-2);
}

function getLastFmToken() {
    let url = new URL(window.location);
    token = url.searchParams.get("token");

    if (!token || !token.length) {
        window.location.href = "https://www.last.fm/api/auth?api_key=" + apiKey;
    }

    apiSig = md5("api_key" + apiKey + "methodauth.getSessiontoken" + token + apiSecret);

    $.ajax({
        type: 'POST',
        url: 'http://ws.audioscrobbler.com/2.0/',
        data: 'method=auth.getSession&' +
            'token=' + token + '&' +
            'api_key=' + apiKey + '&' +
            'api_sig=' + apiSig + '&' +
            'format=json',
        success: function (data) {
            console.log("getSession success")
            userKey = data.session.key;
            isScrobbling = true;
            localStorage.setItem("lastFmSessionKey", userKey);
        },
        error: function (error) {
            console.log("getSession error")
            console.log(error)
        }
    });
}

function getCurrentTrack() {
    var url = 'https://legacy-api.kexp.org/play/?limit=1&end_time=' + new Date().toISOString();

    $.ajax(url).done(function (kexpData) {
        console.log(kexpData)
        // playtypeid = 4 means air break
        if (kexpData.results[0].playtype.playtypeid == 4) {
            console.log(kexpData.results[0].playtype.name)
        } else {
            let trackData = getTrackData(kexpData);

            if (!currentTrackData || (currentTrackData.artist != trackData.artist && currentTrackData.trackName != trackData.trackName)) {
                currentTrackData = trackData;

                $("#artist").text(trackData.artist);
                $("#trackName").text(trackData.trackName);
                $("#albumName").text(trackData.albumName);

                $.ajax({
                    type: 'POST',
                    url: 'http://ws.audioscrobbler.com/2.0/',
                    data: 'method=artist.getinfo&' +
                        'artist=' + formatArtistAndTrackName(trackData.artist) + '&' +
                        'api_key=' + apiKey + '&' +
                        'format=json',
                    dataType: 'jsonp',
                    success: function (data) {
                        console.log(data)
                        if (data.artist) {
                            let trackInfo = {
                                artist: trackData.artist,
                                trackName: trackData.trackName,
                                albumName: trackData.albumName,
                                releaseDate: kexpData.results[0].releaseevent ? kexpData.results[0].releaseevent.year : "not available",
                                airDate: new Date(kexpData.results[0].airdate).getTime(),
                                onTour: data.artist.ontour,
                                tags: data.artist.tags.length ? data.artist.tags.tag[0].name : ""
                            }
                            if (!tracksScrobbled.has(trackInfo.airDate)) {
                                tracksScrobbledTable.row.add([
                                                trackInfo.artist,
                                                trackInfo.trackName,
                                                trackInfo.releaseDate,
                                                trackInfo.airDate,
                                                trackInfo.tags
                                            ]);
                                tracksScrobbledTable.draw();

                                scrobbledTracksArray = JSON.parse(localStorage.getItem("scrobbledTracksArray"));
                                scrobbledTracksArray.push(trackInfo);

                                localStorage.setItem("scrobbledTracksArray", JSON.stringify(scrobbledTracksArray));

                                if (isScrobbling) {
                                    scrobble(trackInfo);
                                }
                            }


                            fullArtistDescription = data.artist.bio.content;
                            $('#artistImage').html('<img class="img-fluid" src="' + data.artist.image[2]['#text'] + '" />');

                            let artistDescription;
                            if (data.artist.bio.content.length > 500) {
                                artistDescription = data.artist.bio.content.substring(0, 500) + " <a href='#' id='readMore'>Read More...</a>"
                            }

                            if (data.artist.ontour == "1") {
                                $("#artist").html($("#artist").text() + " <a class='badge badge-pill badge-success' href='" + data.artist.url + "/+events" + "'>Touring</a>")
                            }

                            $('#artistInfo').html(artistDescription);
                            setTrackTags(data.artist.tags.tag);
                        } else {
                            console.log("No info found for artist")
                        }
                    },
                    error: function (code, message) {
                        console.log('Error Code: ' + code + ', Error Message: ' + message);
                    }
                });
            }
        }
    }).fail(function (error) {
        console.log("error")
        console.log(error)
    })
}

function setTrackTags(tags) {
    if (tags) {
        $("#trackTags").empty();
        tags.forEach(function (tag) {
            $("#trackTags").append('<span class="badge badge-pill badge-success" id="scrobbling">' + tag.name + '</span> ');
        })

    }
}

function getTrackData(data) {
    return {
        artist: data.results[0].artist.name,
        trackName: data.results[0].track ? data.results[0].track.name : "-",
        albumName: data.results[0].release ? data.results[0].release.name : "not available",
        airDate: data.results[0].epoch_airdate
    };
}

function scrobble(trackInfo) {
    let stringBeforeHash = "api_key" + apiKey +
        "artist" + trackInfo.artist.trim() +
        "methodtrack.scrobble" +
        "sk" + userKey +
        "timestamp" + Math.floor(Date.now() / 1000) +
        "track" + trackInfo.trackName.trim() +
        apiSecret;
    let hash = md5(stringBeforeHash);

    let scrobbleData = 'method=track.scrobble&' +
        'artist=' + encodeURIComponent(trackInfo.artist.trim()) + '&' +
        'track=' + encodeURIComponent(trackInfo.trackName.trim()) + '&' +
        'timestamp=' + Math.floor(Date.now() / 1000) + '&' +
        'api_key=' + apiKey + '&' +
        'api_sig=' + hash + '&' +
        'sk=' + userKey;

    $.ajax({
        type: 'POST',
        url: 'http://ws.audioscrobbler.com/2.0/',
        data: scrobbleData,
        success: function (data) {
            console.log("success scrobble")
            console.log(data)
            tracksScrobbled.set(trackInfo.airDate, trackInfo);
        },
        error: function (code, message) {
            console.log(code);
            console.log(message);
            console.log('Error scrobbling');
        }
    });
}

function formatArtistAndTrackName(name) {
    let formattedName = name.replace(/(?:\r\n|\r|\n)/g, '<br />').replace(/ /g, "+");

    console.log(formattedName);

    return formattedName;
}
