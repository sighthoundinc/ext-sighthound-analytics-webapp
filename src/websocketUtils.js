import {Client} from "@stomp/stompjs";

import {getLSServerAddress, getLSServerToggle} from "./watchlistHandler";

const EXCHANGE_NAME = "/exchange/alprdemo_exc";

// Match these settings to what is in rabbitmq-launch.sh.
const defaultBroker = {
    host: getLSServerAddress() || window.location.hostname,
    port: 5672,
    stompPort: 15674,
    user: "guest",
    pass: "guest"
};
let client = null;
let subscription = null;


export async function handleWebSocket(callback, address, savedClient, connectedStatus) {

    // Set up stomp to receive messages from RabbitMQ.
    let connected = false;
    const host = getLSServerAddress() || window.location.hostname;

    const createClient = async () => {
        if (address && savedClient) {
            // Call this to update the URL if it changed.
            client = savedClient;
            if (subscription) {
                subscription.unsubscribe();
                subscription = null;
                connected = false;
            }
            savedClient.configure({
                brokerURL: `ws://${address}:${defaultBroker.stompPort}/ws`,
            });
            await savedClient.deactivate();
        } else {
            // If we have a previous old client, delete it.
            if (savedClient) {
                if (subscription) {
                    subscription.unsubscribe();
                    subscription = null;
                    connected = false;
                }
                await savedClient.deactivate();    
            }
            const specifyServer = getLSServerToggle();
            const hostAddr = specifyServer ? host : address;
            client = new Client({
                brokerURL: `ws://${hostAddr}:${defaultBroker.stompPort}/ws`,
                connectHeaders: {
                    login: defaultBroker.user,
                    passcode: defaultBroker.pass,
                },
                debug: console.debug,
                reconnectDelay: 10000,
            });
        }
    }

    await createClient();
    
    client.onConnect = () => {
        connected = true;
        console.log("Stomp connection=", connected);
        subscription = client.subscribe(EXCHANGE_NAME, callback);
        connectedStatus(true);
    }
    
    client.onStompError = (frame) => {
        console.log("Client stomp error - ", frame.headers["message"]);
    };
    
    if (client) {
        client.activate();
    }
    return client;
}
