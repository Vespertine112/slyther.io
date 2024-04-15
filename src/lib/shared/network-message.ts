export interface NetworkMessage {
	id: number;
	type: string;
	elapsedTime: number;
}

export interface NetworkInputMessage {
	clientId: string;
	message: NetworkMessage;
}
