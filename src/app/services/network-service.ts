import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular/standalone';
import { getInterfaces, NetworkInterface as TauriNetworkInterface } from "tauri-plugin-network-api";
import { invoke } from '@tauri-apps/api/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { 
  writeTextFile, 
  readTextFile, 
  BaseDirectory, 
  exists,
  remove,
  readDir
} from '@tauri-apps/plugin-fs';

import { Helpers } from '../helpers';
import { Shell } from '../utils/shell';
import { InterfaceFile } from '../utils/interfaces.file';
import { FormControl, FormGroup } from '@angular/forms';
import { WPASupplicantFile } from '../utils/wpa-supplicant.file';
import { environment } from '../../environments/environment';

export enum RemoteLookupCommand {
  CMD_FREE_QUERY_REMOTE = 1000,
  CMD_FREE_QUERY = 1001,
  CMD_FREE_QUERY_FAST = 1002,
  CMD_FREE_QUERY_JSONARRAY = 1003,
}

export interface NetworkInterface {
  name: string;
  type: 'wired' | 'wireless';
  mode: 'dhcp' | 'static';
  macAddress: string | null;
  ip: string  | null;
  netmask: string | null;
  gateway: string | null;
  configured: boolean;
  connected: boolean;
  _formGroup: FormGroup;
  _wpaSupplicantFile: WPASupplicantFile;
}

@Injectable({
  providedIn: 'root',
})
export class NetworkService {

  public INTERFACES_FILE = `/tmp/interfaces`;

  checkAddressTimeout: any = null;
  checkingAddress: boolean = false;

  networkInterfaces: Record<string, NetworkInterface> = {};
  selectedInterfaceKey?: string = '';

  interfaceFile: InterfaceFile = new InterfaceFile(this.INTERFACES_FILE);

  constructor(
    private _httpClient: HttpClient,
    private _loadingCtrl: LoadingController,
  ) {}

  async initialize() {
    console.log(environment.production ? 'Production Mode' : 'Development Mode');    
    await this.loadNetworkInterfaces();
  }

  async onSetSelectedInterface(_interface: NetworkInterface) {
    this.selectedInterfaceKey = _interface.name;
  }

  async onSaveInterfaces() {
    console.log('Saving network interfaces...');
    await this.interfaceFile.onSave(this.networkInterfaces)
    for (const _interface of Object.values(this.networkInterfaces)) {
      // Update WPA Supplicant if wireless
      if (_interface._wpaSupplicantFile) {
        _interface._wpaSupplicantFile.network.ssid = _interface._formGroup.value.wifi_ssid;
        _interface._wpaSupplicantFile.network.psk = _interface._formGroup.value.wifi_password;
        await _interface._wpaSupplicantFile.save();
      }
    }
    await this.loadNetworkInterfaces();
  }

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

  private async loadNetworkInterfaces() {
    let _interfaces = await getInterfaces();

    _interfaces = _interfaces.filter(ni => 
      !(
        ni.name.startsWith('docker') ||
        ni.name.startsWith('veth') ||
        ni.name.startsWith('virbr') ||
        ni.name.startsWith('br-') ||
        ni.name.startsWith('tun') ||
        ni.name === 'lo'
      )
    );

    _interfaces = Helpers.sortByKey(_interfaces, 'name');

    for (const _interface of _interfaces) {
      this.networkInterfaces[_interface.name] = await this._getInterfaceInfo(_interface);
    }

    if (!this.selectedInterfaceKey || !this.networkInterfaces[this.selectedInterfaceKey]) {
      if (Object.keys(this.networkInterfaces).length > 0) {
        this.onSetSelectedInterface(Object.values(this.networkInterfaces)[0]);
      }
    }

    console.log('Network Interfaces:', this.networkInterfaces);
  }

  private async _getInterfaceInfo(_interface: TauriNetworkInterface): Promise<any> {
    let _connected = false;
    let _wireless = false;

    try {
      const _res = await Shell.run(`ls /sys/class/net/${_interface.name}/wireless`);
      _wireless = _res.code === 0;
    } catch (error) { 
      console.error(error);
    }

    try {
      const _res = await Shell.run(`cat /sys/class/net/${_interface.name}/operstate`);
      _connected = _res.code === 0 && _res.stdout.trim() === 'up';
    } catch (error) { 
      console.error(error);
    }

    const _routeInfo = await Shell.run(`ip route show dev ${_interface.name} | awk '/default/ {print $3}'`)
    console.log(`_routeInfo ${_interface.name}`, _routeInfo);

    let _gateway: string | null = _routeInfo.code === 0 && _routeInfo.stdout.trim().length > 0 ? _routeInfo.stdout.trim() : null;
    let _ip = _interface.v4_addrs.length > 0 ? _interface.v4_addrs[0].ip! : null;
    let _netmask = _interface.v4_addrs.length > 0 ? _interface.v4_addrs[0].netmask! : null;

    const _infoFromFile = await this.interfaceFile.getInterfaceInfo(_interface.name);

    if (_infoFromFile) {
      console.log('_infoFromFile', _infoFromFile);
      if (_infoFromFile.address) {
        _ip = _infoFromFile.address;
      }
      if (_infoFromFile.netmask) {
        _netmask = _infoFromFile.netmask;
      }
      if (_infoFromFile.gateway) {
        _gateway = _infoFromFile.gateway;
      }
    } else {
      console.warn(`No info from file for interface ${_interface.name}!`);
    }

    // const _wpaSupplicantFile = _wireless ? new WPASupplicantFile(`/etc/wpa_supplicant/wpa_supplicant-${_interface.name}.conf`) : null;
    const _wpaSupplicantFile = _wireless ? new WPASupplicantFile(`/tmp/wpa_supplicant-${_interface.name}.conf`) : null;

    const _formGroup: any = new FormGroup({
      ip: new FormControl({ value: _ip, disabled: false }),
      netmask: new FormControl({ value: _netmask, disabled: false }),
      gateway: new FormControl({ value: _gateway, disabled: false }),
      wifi_ssid: new FormControl({ value: null, disabled: false }),
      wifi_password: new FormControl({ value: null, disabled: false }),
    });

    if (_wpaSupplicantFile) {
      await _wpaSupplicantFile.load();

      _formGroup.patchValue({
        wifi_ssid: _wpaSupplicantFile.network.ssid,
        wifi_password: _wpaSupplicantFile.network.psk,
      });
    }

    return {
      name: _interface.name,
      type: _wireless ? 'wireless' : 'wired',
      mode: _infoFromFile?.method === 'static' ? 'static' : 'dhcp',
      macAddress: _interface.mac_addr,
      ip: _ip,
      netmask: _netmask,
      gateway: _gateway,
      configured: _infoFromFile?.method === 'static',
      connected: _connected,
      _formGroup: _formGroup,
      _wpaSupplicantFile,
    }
  }

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
