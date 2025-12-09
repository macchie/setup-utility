import { Injectable } from '@angular/core';
import { Command } from '@tauri-apps/plugin-shell';
import { clean as SemVerClean } from 'semver';
import packageInfo from '../../../package.json'; // Adjust path to root
import { EnvVarFile } from '../utils/envvar-file';

@Injectable({
  providedIn: 'root',
})
export class POSService {

  public static ELVISENV_PATH: string = '/tmp/elvisenv';

  clock: Date = new Date();

  public versions = {
    app: SemVerClean(packageInfo.version) || '0.0.0',
    ecli: '0.0.0',
  }

  public isConfigured: boolean = false;
  public isConnected: boolean = false;

  public serverIp!: string;
  public deviceId: number = -1;

  constructor() {
    setInterval(() => { this.clock = new Date(); }, 1000);
  }

  public async readConfiguration() {
    this._readECLIVersion();
    this._loadElvisEnv();
  }

  // private

  private async _readECLIVersion(): Promise<string | undefined> {
    if (this.versions.ecli) return this.versions.ecli;

    const _command = `dpkg -s ecli | grep Version`;
    const _result = await Command.create('exec-sh', ['-c', _command]).execute();

    if (_result.code === 0) {
      const [major, minor, patch] = _result.stdout.replace('Version:', '').trim().split('.');
      this.versions.ecli = SemVerClean(`${major}.${minor}.${patch}`) || '0.0.0';
    } else {
      console.error('Error fetching ECLI version:', _result.stderr);
    }
    
    return this.versions.ecli;
  }

  private async _loadElvisEnv(): Promise<void> {
    const _envVarFile = new EnvVarFile(POSService.ELVISENV_PATH);
    this.isConfigured = _envVarFile.getValue('CLONELOCK')?.toLocaleLowerCase() === 'false';
    this.deviceId = parseInt(_envVarFile.getValue('ELVIS_DEVICE_ID') || '-1', 10);
    this.serverIp = _envVarFile.getValue('ELVIS_SERVER_IP') || '';
  }

  
}
