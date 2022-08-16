const connectInfo = document.getElementById('wallet-info')

let account;

export async function requestAccount(){
    return new Promise((resolve, reject) => {
        ethereum.request({method: 'eth_requestAccounts'}).then(accounts => {
            account = accounts[0];
            connectInfo.style.display = 'inline-block'
            connectInfo.innerText = account
            console.log('requestAccount', account)

            if (typeof window.ethereum !== 'undefined') {
                console.log('MetaMask is installed!');
            } else {
                connectInfo.style.display = 'inline-block'
                connectInfo.innerText = "Bạn cần cài đặt tiện ích Ethereum để khởi chạy ứng dụng"
                reject()
            }
    
            ethereum.request({method: 'eth_getBalance' , params: [account, 'latest']}).then(result => {
                console.log('eth_getBalance', result);
                resolve()
            });
    
        }).catch(err => {
            connectInfo.style.display = 'none'
            reject()
        });
    })
    
}