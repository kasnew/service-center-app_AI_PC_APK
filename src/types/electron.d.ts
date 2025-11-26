export interface IpcRenderer {
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
    off(channel: string, listener: (event: any, ...args: any[]) => void): void;
    send(channel: string, ...args: any[]): void;
}

declare global {
    interface Window {
        ipcRenderer: IpcRenderer;
    }
}
