console.log("client-side js loaded");


// nav listeners
var navToggles = [...document.getElementsByClassName("dropdown-toggle")];
var navDropdowns = [...document.querySelectorAll(".nav-button ul")];

function toggleNavDropdown(thisButton) {
    navDropdowns.forEach(dropdown => {
        if (thisButton.id.replace("-dropdown-button","") === dropdown.id.replace("-dropdown","")) {
            dropdown.classList.toggle("hidden");
        }
    })
}

navToggles.forEach(button => {
    button.addEventListener('click', toggleNavDropdown.bind(this,button));
})

document.getElementById("login-toggle").addEventListener("click", function () {
    document.getElementById("login-modal-container").classList.remove("hidden");
})


// login system
document.getElementById("close-login").addEventListener("click", function() {
    document.getElementById("login-modal-container").classList.add("hidden");
})

async function sendLogin(type) {
    var usernameField = document.getElementById("login-username");
    var passwordField = document.getElementById("login-password");
    var o = {
        username: usernameField.value,
        password: passwordField.value,
        userTZ: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    var loginResponse = await fetch('/auth/'+type, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(o)
    });
    var loginReply = await loginResponse.text();

    if (loginReply=="Account created" || loginReply=="Logged in") {
        location.reload();
    }else {
        document.getElementById("login-message").textContent = loginReply;
    }
    console.log(loginReply);
}


document.getElementById("login-button").addEventListener("click", function() {
    sendLogin('login');
})

document.getElementById("signup-button").addEventListener("click", function() {
    sendLogin('signup');
})


// share system toggles
document.getElementById("share-modal-toggle").addEventListener("click", function() {
    document.getElementById("share-modal-container").classList.remove("hidden");
});

document.getElementById("close-share").addEventListener("click", function() {
    document.getElementById("share-modal-container").classList.add("hidden");
});


// Debug Keybind
window.addEventListener('keyup', function(e){
    if (e.shiftKey && e.ctrlKey && e.altKey && e.code == "KeyI") {
        [...document.getElementsByClassName("debug")].forEach(elem => {
            elem.classList.toggle("hidden");
        })
        console.log("Debug Toggled");
    }
}, false);