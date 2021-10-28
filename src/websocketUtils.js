import * as stomp from "./stomp";

const EXCHANGE_NAME = "/exchange/alprdemo_exc";

// Match these settings to what is in rabbitmq-launch.sh.
const defaultBroker = {
    host: window.location.hostname ?? "http://localhost:4000",
    port: 5672,
    stompPort: 15674,
    user: "guest",
    pass: "guest"
};

export async function handleWebSocket(callback) {

    // Set up stomp to receive messages from RabbitMQ.
    let connected = false;

    const client = await stomp.clientConnect({
	    brokerURL: `ws://${defaultBroker.host}:${defaultBroker.stompPort}/ws`,
        connectHeaders: {
            login: defaultBroker.user,
            passcode: defaultBroker.pass,
        },
        debug: console.debug,
    }, () => {
        connected = true;
    });
    console.log("Stomp connection=", connected);

    client.subscribe(EXCHANGE_NAME, callback);
}
