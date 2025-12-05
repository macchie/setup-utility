import { Injectable } from '@angular/core';
import { LoadingController, AlertController } from '@ionic/angular/standalone';
import { getInterfaces } from "tauri-plugin-network-api";
import { invoke } from '@tauri-apps/api/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export enum RemoteLookupCommand {
  CMD_FREE_QUERY_REMOTE = 1000,
  CMD_FREE_QUERY = 1001,
  CMD_FREE_QUERY_FAST = 1002,
  CMD_FREE_QUERY_JSONARRAY = 1003,
}

@Injectable({
  providedIn: 'root',
})
export class NetworkService {

  checkAddressTimeout: any = null;
  checkingAddress: boolean = false;
  
  constructor(
    private _httpClient: HttpClient,
    private _loadingCtrl: LoadingController,
    private _alertCtrl: AlertController,
  ) {}

  async checkPort(host: string, port: number): Promise<boolean> {
    try {
      console.log(`Checking port ${port} on host ${host}...`);
      return await invoke<boolean>('check_port', { host, port });
    } catch (error) {
      return false;
    }
  }

  async checkPorts(host: string, ports: number[]): Promise<number[]> {
    try {
      console.log(`Checking ports ${ports.join(', ')} on host ${host}...`);
      return await invoke<number[]>('check_ports', { host, ports });
    } catch (error) {
      return [];
    }
  }

  async remoteLookup(command: RemoteLookupCommand, query: string, host = 'memphisserver'): Promise<any> {
    try {
      const _resp = await firstValueFrom(
        this._httpClient.post(
          `http://${host}:7392/api/db-operations/remote-lookup`, 
          { request: { query: query, command: command }}
        )
      );

      return _resp;
    } catch (error) {
      return null;
    }
  }

  async getServersOnNetworks() {
    // const _confirm = await this.askConfirm(`Scan Network`, `Are you sure you want to install scan your local networks for Servers? This may take a few minutes.`);

    // if (!_confirm) {
    //   return;
    // }

    const _loading = await this._loadingCtrl.create({
      message: 'Searching LAN for Servers...'
    });

    await _loading.present();
    const _results = await this.scanNetworksForServer();
    await _loading.dismiss();

    return _results;
  }

  // private 

  private async scanNetworksForServer() {
    const _interfaces = await getInterfaces();

    let _foundServers: {
      host: string;
    }[] = [];

    for (const _interface of _interfaces) {
      if (
        _interface.name.startsWith('docker') ||
        _interface.name.startsWith('veth') ||
        _interface.name.startsWith('virbr') ||
        _interface.name.startsWith('br-') ||
        _interface.name === 'lo'
      ) {
        continue;
      }

      if (_interface.v4_addrs.length === 0) {
        continue;
      }

      console.log(`Scanning interface: ${_interface.name} - ${_interface.v4_addrs[0].ip}`);

      const _subnet = _interface.v4_addrs[0].ip.split('.').slice(0, 3).join('.');
      const _hosts = Array.from({ length: 255 }, (_, i) => `${_subnet}.${i + 1}`);

      console.log(`Starting scan of ${_hosts.length} IPs on ${_subnet}.x...`);

      const _ports = [7392, 873];
      const _checks = _hosts.map(host => invoke<number[]>('check_ports', { host, ports: _ports }).then(openPorts => ({ host, valid: openPorts.length === _ports.length })) );
      const _results = await Promise.all(_checks);
      const _foundIPs = _results.filter(res => res.valid).map(res => res.host);

      console.log(`Results for ${_subnet}.x : ${_foundIPs.length > 0 ? _foundIPs.join(', ') : 'no servers found.'}`);

      return _results.filter(res => res.valid).map(res => ({ host: res.host }));
    }

    return _foundServers;
  }

  
}
