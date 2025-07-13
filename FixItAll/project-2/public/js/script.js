document.addEventListener("DOMContentLoaded", function () {
    const firstModalEl = document.getElementById("createAccountModal");
    const secondModalEl = document.getElementById("customerSignupModal");
    const termsModalEl = document.getElementById("termsModal");
    const loginModalEl = document.getElementById("loginModal");
    const serviceProviderModalEl = document.getElementById('serviceProviderSignupModal');
    const serviceTermsModalEl = document.getElementById("ServicetermsModal");
    const serviceLoginModalEl = document.getElementById("ServiceloginModal");
    const loginModalFirstEl = document.getElementById("loginModalFirst")

    const firstModal = new bootstrap.Modal(firstModalEl);
    const secondModal = new bootstrap.Modal(secondModalEl);
    const termsModal = new bootstrap.Modal(termsModalEl);
    const loginModal = new bootstrap.Modal(loginModalEl);
    const serviceProviderModal = new bootstrap.Modal(serviceProviderModalEl);
    const serviceTermsModal = new bootstrap.Modal(serviceTermsModalEl);
    const serviceLoginModal = new bootstrap.Modal(serviceLoginModalEl);
    const loginModalFirst = new bootstrap.Modal(loginModalFirstEl)

    const customerBtn = document.getElementById("customerBtn");
    const serviceProviderBtn = document.getElementById("serviceProviderBtn");
    const backToModalButtons = document.querySelectorAll(".backToModal");
    const termsLink = document.getElementById("termsLink");
    const backToSignup = document.getElementById("backToSignup");
    const loginLink = document.getElementById("loginLink");
    const signUpLink = document.getElementById("signUpLink");
    const serviceTermsLink = document.getElementById("serviceTermsLink");
    const serviceLoginLink = document.getElementById("ServiceloginLink");
    const serviceSignUpLink = document.getElementById("signUpLink");
    const backToServiceProviderSignup = document.getElementById("backToServiceProviderSignup");
    const serviceSignUpFromLogin = document.getElementById("serviceSignUpFromLogin");
    const quickBook = document.getElementById("quickBook");
    const customerLoginBtn = document.getElementById("customerLoginBtn")
    const serviceProviderLoginBtn = document.getElementById("serviceProviderLoginBtn")

    let isSwitchingModals = false;

    // Helper function
    function switchModal(hideEl, showModalInstance) {
        const hideModal = bootstrap.Modal.getInstance(hideEl);
        if (hideModal) {
            isSwitchingModals = true;
            hideModal.hide();
            const onHidden = function () {
                if (isSwitchingModals) {
                    showModalInstance.show();
                }
                isSwitchingModals = false;
                hideEl.removeEventListener("hidden.bs.modal", onHidden);
            };
            hideEl.addEventListener("hidden.bs.modal", onHidden);
        } else {
            showModalInstance.show();
        }
    }

    // Button actions
    serviceProviderBtn.addEventListener("click", function () {
        switchModal(firstModalEl, serviceProviderModal);
    });

    customerBtn.addEventListener("click", function () {
        switchModal(firstModalEl, secondModal);
    });

    customerLoginBtn.addEventListener("click", function () {
        switchModal(loginModalFirstEl, loginModal);
    });
    
    serviceProviderLoginBtn.addEventListener("click", function () {
        switchModal(loginModalFirstEl, serviceLoginModal);
    });

    backToModalButtons.forEach(button => {
        button.addEventListener("click", function () {
            if (serviceProviderModalEl.classList.contains("show")) {
                switchModal(serviceProviderModalEl, firstModal);
            } else if (secondModalEl.classList.contains("show")) {
                switchModal(secondModalEl, firstModal);
            }
        });
    });


    termsLink.addEventListener("click", function (event) {
        event.preventDefault();
        switchModal(secondModalEl, termsModal);
    });

    backToSignup.addEventListener("click", function () {
        switchModal(termsModalEl, secondModal);
    });

    loginLink.addEventListener("click", function (event) {
        event.preventDefault();
        if (bootstrap.Modal.getInstance(secondModalEl)) {
            switchModal(secondModalEl, loginModal);
        } else if (bootstrap.Modal.getInstance(firstModalEl)) {
            switchModal(firstModalEl, loginModal);
        }
    });

    signUpLink.addEventListener("click", function (event) {
        event.preventDefault();
        switchModal(loginModalEl, secondModal);
    });


    // Show Service Terms Modal
    serviceTermsLink.addEventListener("click", function (event) {
        event.preventDefault();
        switchModal(serviceProviderModalEl, serviceTermsModal);
    });

    // Go back to Service Provider Signup from Terms
    backToSignup.addEventListener("click", function () {
        switchModal(serviceTermsModalEl, serviceProviderModal);
    });

    // Show Login Modal from Service Provider Signup
    serviceLoginLink.addEventListener("click", function (event) {
        event.preventDefault();
        switchModal(serviceProviderModalEl, serviceLoginModal);
    });

    // Go back to Service Provider Signup from Login Modal
    serviceSignUpLink.addEventListener("click", function (event) {
        event.preventDefault();
        switchModal(serviceLoginModalEl, serviceProviderModal);
    });
    backToServiceProviderSignup.addEventListener("click", function () {
        switchModal(serviceTermsModalEl, serviceProviderModal);
    });

    // Go to Service Provider Signup from Login Modal
    serviceSignUpFromLogin.addEventListener("click", function (event) {
        event.preventDefault();
        switchModal(serviceLoginModalEl, serviceProviderModal);
    });

});
