import { Injectable } from '@angular/core';
import { Command } from '@tauri-apps/plugin-shell';
import { clean as SemVerClean } from 'semver';
import packageInfo from '../../../package.json'; // Adjust path to root

@Injectable({
  providedIn: 'root',
})
export class POSService {

  public appVersion: string = SemVerClean(packageInfo.version) || '0.0.0';
  public ecliVersion?: string;

  constructor() {

  }

  public async getECLIVersion(): Promise<string | undefined> {
    if (this.ecliVersion) return this.ecliVersion;

    const _command = `dpkg -s ecli | grep Version`;
    const _result = await Command.create('exec-sh', ['-c', _command]).execute();

    if (_result.code === 0) {
      const [major, minor, patch] = _result.stdout.replace('Version:', '').trim().split('.');
      this.ecliVersion = SemVerClean(`${major}.${minor}.${patch}`) || '0.0.0';
    } else {
      console.error('Error fetching ECLI version:', _result.stderr);
      this.ecliVersion = '0.0.0';
    }
    
    return this.ecliVersion;
  }

  
}
