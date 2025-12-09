import { Command } from "@tauri-apps/plugin-shell";

export class Shell {

  public static customEnv: {
    [key: string]: string;
  } = { 
    RSYNC_PASSWORD: 'ef7dc668-8fc3-47a2-ba45-f0d9582c55d5',
  };
  
  static async run(_command: string): Promise<any> {
    const _result = await Command.create('exec-sh', ['-c', _command]).execute();

    return _result
  }
}