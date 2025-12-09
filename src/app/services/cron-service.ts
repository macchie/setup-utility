import { Injectable } from '@angular/core';

import { 
  writeTextFile, 
  readTextFile, 
  BaseDirectory, 
  exists,
  remove
} from '@tauri-apps/plugin-fs';
import { CRONTAB_DEFAULT_TASKS, CRONTAB_DEFAULTS } from '../utils/crontab.defaults';

export interface CronTask {
  rule: string;
  description: string;
  command: string;
  active: boolean;
  readonly: boolean;
  editable: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CronService {

  public CONFIG_FILE = `/tmp/crontab.config.json`;
  public CRONTAB_FILE = `/tmp/crontab`;

  public tasks: CronTask[] = [];

  constructor() {}

  public async initialize(): Promise<void> {
    console.log('CronService initialized');
    await this._readConfigFile();

  }

  // private
  
  private async _readConfigFile() {
    try {
      await remove(this.CONFIG_FILE);

      let _fileExists = await exists(this.CONFIG_FILE);

      if (!_fileExists) {
        await this._writeDefaultConfigFile();

        _fileExists = await exists(this.CONFIG_FILE);

        if (!_fileExists) {
          throw new Error('Failed to create config file');
        }

        console.log('Default config file created');
      }

      const content = await readTextFile(this.CONFIG_FILE);
      
      
      const parsed = JSON.parse(content);
      console.log('File content:', parsed);

      this.tasks = parsed.tasks || [];
    } catch (err) {
      console.error('Failed to handle file:', err);
    }
  }

  private async _writeDefaultConfigFile() {
    const _content = JSON.stringify({
      shell: CRONTAB_DEFAULTS.shell,
      path: CRONTAB_DEFAULTS.path,
      tasks: Object.values(CRONTAB_DEFAULT_TASKS),
    }, null, 2);

    await writeTextFile(this.CONFIG_FILE, _content);
  }
}
