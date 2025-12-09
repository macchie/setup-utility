import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonList, IonBadge, IonModal, IonTitle, IonToolbar, IonButton, IonIcon, NavController, ModalController, AlertController, IonItem, IonHeader, IonInput, IonLabel, IonSpinner, IonFooter, IonText } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, browsersOutline, cubeOutline, globeOutline, hammerOutline, radioOutline, checkmarkCircleOutline, wifiOutline, wifi, checkmarkCircle, closeCircle, desktopOutline, calendarOutline, printOutline, layersOutline, wifiSharp, extensionPuzzleOutline, hardwareChipOutline, powerOutline, ellipse, settingsOutline, settingsSharp } from 'ionicons/icons';
import { POSService } from '../services/posservice';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworkService, RemoteLookupCommand } from '../services/network-service';
import { Helpers } from '../helpers';
import { Command } from '@tauri-apps/plugin-shell';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, 
    IonFooter, 
    IonToolbar,
    IonContent,
    IonInput, 
    IonItem, 
    IonButton, 
    IonIcon, 
    IonModal,
    IonTitle,
    IonList,
    IonBadge,
    IonSpinner,
    IonLabel, 
  ],
})
export class HomePage implements OnInit {

  manualSetupAlert!: HTMLIonAlertElement;
  browserSetupAlert!: HTMLIonAlertElement;

  @ViewChild('manualSetupModal', { static: true })
  manualSetupModal!: HTMLIonModalElement;

  setupData: {
    serverAddress?: string;
    serverAddressValid?: boolean;
    deviceId?: number;
    deviceIdValid?: boolean;
  } = {
  }

  deviceData: {
    id?: string;
    storeId?: string;
    deviceType?: string;
    deviceTypeId?: number;
    description?: string;
    serialNumber?: string;
    deviceNumber?: number;
  } = {}

  serverAddressStatus: string = '';
  checkingAddress: boolean = false;

  deviceIdStatus: string = '';
  checkingDevice: boolean = false;

  lastSeedUpdate: Date | null = null;
  lastSeedBadgeColor: string = '';

  constructor(
    private _cd: ChangeDetectorRef,
    private _navCtrl: NavController,
    private _alertCtrl: AlertController,
    public posSvc: POSService,
    public networkSvc: NetworkService,
  ) {
    addIcons({ 
      browsersOutline,  
      calendarOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      ellipse,
      closeCircle,
      closeOutline,
      cubeOutline,
      desktopOutline,
      extensionPuzzleOutline,
      globeOutline,
      hammerOutline,
      hardwareChipOutline,
      layersOutline,
      printOutline,
      powerOutline,
      radioOutline,
      settingsSharp,
      wifi,
      wifiSharp
    })
  }

  async ngOnInit() {
    this.onServerAddressChange('lando.elvispos.com');
  }

  async onNavigateTo(_page: string) {
    this._navCtrl.navigateForward(`/${_page}`);
  }

  async onServerAddressChange(_address: string) {
    console.log('Server Address Changed:', _address);
    
    this.deviceData = {};
    this.setupData.deviceId = undefined;
    this.setupData.deviceIdValid = false;
    this.deviceIdStatus = '';
    this.setupData.serverAddressValid = false;
    this.setupData.serverAddress = _address;
    this.serverAddressStatus = '';

    if (this.setupData.serverAddress.trim().length === 0) {
      console.log('Empty address entered.');
      return;
    }

    if (this.setupData.serverAddress.split('.').length > 2 || Helpers.isValidIP(this.setupData.serverAddress)) {
      console.log('Valid address entered.');
      this.checkingAddress = true;
      const _openPorts = await this.networkSvc.checkPorts(this.setupData.serverAddress, [7392, 873]);
      this.setupData.serverAddressValid = _openPorts.length === 2;
      this.serverAddressStatus = 'success';
      this.checkingAddress = false;
      console.log('Address validation result:', this.setupData.serverAddressValid);
    } else {
      this.serverAddressStatus = 'danger';
      console.log('Invalid address entered.');
    }
  }

  async onDeviceIDChange(_deviceId: number) {
    if (!this.setupData.serverAddressValid) {
      return;
    }

    this.deviceData = {};
    this.setupData.deviceId = _deviceId;
    this.setupData.deviceIdValid = false;
    this.lastSeedBadgeColor = '';
    this.lastSeedUpdate = null;
    this.deviceIdStatus = '';
    
    console.log('Device ID Changed:', _deviceId);
    
    if (!this.setupData.deviceId) {
      console.log('Empty Device ID entered.');
      return;
    }

    this.checkingDevice = true;
    
    const query = `
      SELECT 
        d.n0_device_id AS "id",
        d.n0_store_id AS "storeId",
        d.sz_description AS "description",
        d.n0_store_dev_type AS "deviceTypeId",
        d.sz_serial_number AS "serialNumber",
        d.n0_device_number AS "deviceNumber",
        sdt.sz_device_name as "deviceType"
      FROM system.devices AS d
      JOIN system.store_device_types AS sdt ON (d.n0_store_dev_type = sdt.n0_store_dev_type)
      WHERE 
        d.n0_device_id = ${_deviceId} AND 
        (d.online_status = FALSE OR d.online_status IS NULL) AND d.dt_deleted IS NULL;
    `;

    const resp = await this.networkSvc.remoteLookup(RemoteLookupCommand.CMD_FREE_QUERY_JSONARRAY, query, this.setupData.serverAddress);
    console.log('Remote lookup response:', resp);

    if (resp) {
      this.deviceData = resp[0];
      console.log(`Device Data:`, this.deviceData);
      this.setupData.deviceIdValid = this.deviceData.id != null;
      this.deviceIdStatus = this.setupData.deviceIdValid ? 'success' : 'danger';
    } else {
      this.deviceIdStatus = 'danger';
    }

    this.checkingDevice = false;

    const _command = `RSYNC_PASSWORD=ef7dc668-8fc3-47a2-ba45-f0d9582c55d5 rsync -avz --list-only elvispos@lando.elvispos.com::share/STORE_SEEDS/`;
    const _result = await Command.create('exec-sh', ['-c', _command]).execute();

    if (_result.code === 0) {
      console.log('Rsync output:', _result.stdout);

      for (const line of _result.stdout.split('\n')) {
        if (line.includes(`s${this.deviceData.storeId}-db-data.sql.gz`)) {
          const parts = line.split(' ');
          this.lastSeedUpdate = new Date(`${parts[parts.length-3]} ${parts[parts.length-2]}`);

          if (new Date().getTime() > this.lastSeedUpdate.getTime() + (1000 * 60 * 60 * 24 * 5)) {
            this.lastSeedBadgeColor = 'danger';
          }
          
          if (
            new Date().getTime() > this.lastSeedUpdate.getTime() + (1000 * 60 * 60 * 24) &&
            new Date().getTime() < this.lastSeedUpdate.getTime() + (1000 * 60 * 60 * 24 * 5)
          ) {
            this.lastSeedBadgeColor = 'warning';
          }

          if (new Date().getTime() < this.lastSeedUpdate.getTime() + (1000 * 60 * 60 * 24)) {
            this.lastSeedBadgeColor = 'success';
          }
        }
      }

      this._cd.detectChanges();
    }
  }

  async onScanNetworks() {
    const foundServers = await this.networkSvc.getServersOnNetworks();

    if (foundServers.length > 0) {
      const _alert = await this._alertCtrl.create({
        cssClass: 'select-alert',
        header: `${foundServers.length}x Servers Found!`,
        message: 'The following servers were found on your local networks. Please select one to continue.',
        inputs: foundServers.map(server => {
          return {
            name: server.host,
            type: 'radio',
            label: server.host,
            value: server.host
          };
        }) as any,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'OK',
            handler: (value) => {
            }
          }
        ]
      });

      await _alert.present();
      const _resp = await _alert.onDidDismiss();

      console.log('Selected server:', _resp.data.values);
      
      this.setupData.serverAddress = _resp.data.values;
      this.setupData.serverAddressValid = true;
      this.setupData.deviceId = undefined;
      this.setupData.deviceIdValid = false;
      this.deviceIdStatus = '';
      this.deviceData = {};

      return _resp.data.values;
    } else {
      const _alert = await this._alertCtrl.create({
        header: 'No Servers Found!',
        message: 'No servers were found on your local networks.',
        buttons: ['OK']
      });

      await _alert.present();
      await _alert.onDidDismiss();

      return null;
    }
  }

  async onSearchDevices() {
    if (!this.setupData.serverAddressValid) {
      return;
    }


    const query = `
      SELECT 
        d.n0_device_id AS "id",
        d.n0_store_id AS "storeId",
        d.sz_description AS "description",
        d.n0_store_dev_type AS "deviceTypeId",
        d.sz_serial_number AS "serialNumber",
        d.n0_device_number AS "deviceNumber",
        sdt.sz_device_name as "deviceType"
      FROM system.devices AS d
      JOIN system.store_device_types AS sdt ON (d.n0_store_dev_type = sdt.n0_store_dev_type)
      WHERE 
        sdt.sz_device_name NOT IN ('API', 'STORE-SERVER', 'YELLOWBOX') AND
        (d.online_status = FALSE OR d.online_status IS NULL) AND d.dt_deleted IS NULL
      ORDER BY d.n0_device_id ASC;
    `;

    const _foundDevices = await this.networkSvc.remoteLookup(RemoteLookupCommand.CMD_FREE_QUERY_JSONARRAY, query, this.setupData.serverAddress);
    console.log('Remote lookup response:', _foundDevices);

    const _alert = await this._alertCtrl.create({
      cssClass: 'select-alert',
      header: `${_foundDevices.length}x Devices Found`,
      message: 'The following devices were found. Please select one to continue.',
      inputs: _foundDevices.map((device: any) => {
        return {
          type: 'radio',
          label: `#${device.id}${device.deviceNumber > 0 ? ' / ' + device.deviceNumber : ''} - ${device.description || 'NO DESCRIPTION'}`,
          value: device.id
        };
      }) as any,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          role: 'confirm',
          handler: (value) => {
            if (value) {
              console.log('Selected Device:', value);
              this.onDeviceIDChange(value);
            }
          }
        }
      ]
    });

    await _alert.present();
  }

  async onManualSetup() {
    if (this.manualSetupAlert) {
      return;
    }

    // const setupAlert = await this._modalCtrl.create({
    //   component: ManualSetupDialogComponent,
    //   backdropDismiss: false,
    //   componentProps: {
    //     title: 'Manual POS Setup',
    //     message: 'Please input your Server IP Address and POS Device ID',
    //   }
    // })        

    // setupAlert.onDidDismiss().then((resp) => {
    //   if (resp.data) {
    //     if (!Helpers.isValidIP(resp.data.serverAddress)) {
    //       this.alertCtrl.create({
    //         header: 'Manual POS Setup',
    //         message: 'Invalid Server IP Address',
    //         buttons: ['OK']
    //       }).then(alert => alert.present());
    //       return;
    //     }

    //     console.log(JSON.stringify({serverAddress: resp.data.serverAddress, deviceId:  resp.data.deviceId}))

    //     this._navCtrl.navigateForward(`/create-from-server`, { 
    //       queryParams: {
    //         token: JSON.stringify({serverAddress: resp.data.serverAddress, deviceId:  resp.data.deviceId}),
    //       } 
    //     })
    //   }
    // });

    // await setupAlert.present();
  }
}
