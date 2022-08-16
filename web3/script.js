const serverUrl = "https://cumql978gsfe.usemoralis.com:2053/server"; //Server url from moralis.io
const appId = "gkWsQZ1LGY1wCDqTTJEMVx7oEKNdJYz4oJYdP5UA"; // Application id from moralis.io
Moralis.start({ serverUrl, appId });

const authButton = document.getElementById('btn-auth');
// const enableButton = document.getElementById('btn-enable');
const logoutButton = document.getElementById('btn-logout');
// const callButton = document.getElementById('btn-call');
// const subheader = document.getElementById('subheader');
// const resultBox = document.getElementById('result');
const connectInfo = document.getElementById('wallet-info')

let user;
let web3;
let result = '';

const provider = 'walletconnect';

function renderApp() {
  user = Moralis.User.current();

  if (user) {
    authButton.style.display = 'none';
    logoutButton.style.display = 'inline-block';
    console.log('user', user, user.get('ethAddress'))
    // subheader.innerText = `Welcome ${user.get('username')}`;
    connectInfo.style.display = 'inline-block'
    connectInfo.innerText = `Connected as ${user.get('ethAddress')}`

    if (web3) {
    //   callButton.style.display = 'inline-block';
    //   enableButton.style.display = 'none';
    } else {
    //   callButton.style.display = 'none';
    //   enableButton.style.display = 'inline-block';
    }
  } else {
    authButton.style.display = 'inline-block';
    // callButton.style.display = 'none';
    logoutButton.style.display = 'none';
    connectInfo.style.display = 'none'
    // subheader.innerText = '';
    // enableButton.style.display = 'none';
  }

//   resultBox.innerText = result;
}

async function authenticate() {
  try {
    user = await Moralis.authenticate({ provider });
    web3 = await Moralis.enableWeb3({ provider });
  } catch (error) {
    console.log('authenticate failed', error);
  }
  renderApp();
}

async function logout() {
  try {
    await Moralis.User.logOut();
  } catch (error) {
    console.log('logOut failed', error);
  }
  result = '';
  renderApp();
}

async function testCall() {
  try {
    result = await web3.eth.personal.sign('Hello world', user.get('ethAddress'));
  } catch (error) {
    console.log('testCall failed', error);
  }
  renderApp();
}

async function enableWeb3() {
  try {
    web3 = await Moralis.enableWeb3({ provider });
  } catch (error) {
    console.log('testCall failed', error);
  }
  renderApp();
}

authButton.onclick = authenticate;
logoutButton.onclick = logout;
// callButton.onclick = testCall;
// enableButton.onclick = enableWeb3;

renderApp();