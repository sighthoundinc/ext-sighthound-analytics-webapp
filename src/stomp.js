import {Client} from "@stomp/stompjs";

export async function clientConnect(config, onConnect) {

    return new Promise((accept, reject) => {

        const client = new Client(config);

        client.onConnect = (receipt) => {
            onConnect(receipt);
            accept(client);
        }

        client.onStompError = (frame) => {
            reject(new Error(frame.headers["message"]));
        };

        client.activate();
    });
}
