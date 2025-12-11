import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonLabel, IonTitle, IonToolbar, IonButton, IonIcon, IonCard, NavController, IonList, IonItemDivider, IonItem, IonBadge, IonToggle, IonButtons, IonInput, IonCardContent, IonText, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, calendarOutline, checkmarkCircleOutline, closeOutline, createOutline, ellipse, ellipseOutline, pulseOutline, radioButtonOff, radioButtonOn, save, saveOutline, settingsOutline, wifiOutline, wifiSharp } from 'ionicons/icons';
import { CronService } from '../../services/cron-service';
import { NetworkInterface, NetworkService } from '../../services/network-service';

@Component({
  selector: 'app-network-setup',
  templateUrl: './network-setup.page.html',
  styleUrls: ['./network-setup.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    ReactiveFormsModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonCard, 
    IonList, 
    IonItemDivider, 
    IonItem, 
    IonLabel,
    IonButton, 
    IonIcon, 
    IonCardContent,
    IonInput,
    IonBadge,
    IonText
]
})
export class NetworkSetupPage implements OnInit {

  _section: 'network' | 'dns' | 'proxy' = 'network';

  _selectedInterfaceKey?: string;
  _interfacesFormGroups: Record<string, FormGroup> = {};

  get canSaveNetwork() {
    for (let key in this._interfacesFormGroups) {
      if (this._interfacesFormGroups[key].valid && this._interfacesFormGroups[key].dirty) {
        return true;
      }
    }

    return false;
  }

  constructor(
    public cronSvc: CronService,
    public networkSvc: NetworkService,
    private _navCtrl: NavController,
    private _alertCtrl: AlertController
  ) {
    addIcons({ 
      addOutline,
      calendarOutline,
      checkmarkCircleOutline,
      closeOutline,
      createOutline,
      radioButtonOff,
      radioButtonOn,
      save,
      saveOutline,
      settingsOutline,
      wifiSharp
    });
  }

  async ngOnInit() {
    await this.onRefresh();
  }

  async onRefreshSection() {
    this.onRefresh();
    return;
    const _alert = await this._alertCtrl.create({
      header: 'Warning',
      message: 'Are you sure you want to refresh the current section? Unsaved changes will be lost.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Refresh',
          handler: () => {
            this.networkSvc.initialize();
          }
        }
      ]
    });

    await _alert.present();
  }

  async onSetSelectedInterface(_interface: NetworkInterface) {
    this._selectedInterfaceKey = _interface.name;
  }

  async onSaveInterfaces() {
    await this.networkSvc.onSaveInterfaces(this._interfacesFormGroups);
    await this.onRefresh();
  }

  async onChangeSection(_newSection: 'network' | 'dns' | 'proxy') {
    if (this._section === _newSection) {
      return;
    }

    let _dirty = false;

    for (let key in this._interfacesFormGroups) {
      if (this._interfacesFormGroups[key].dirty) {
        _dirty = true;
        break;
      }
    }

    if (!_dirty) {
      this._section = _newSection;
      return;
    }

    const _alert = await this._alertCtrl.create({
      header: 'Change Section',
      message: 'Are you sure you want to change section? Unsaved changes will be lost.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Change',
          handler: async () => {
            await this.onRefreshSection();
            this._section = _newSection;
            await this.onRefreshSection();
          }
        }
      ]
    });

    await _alert.present();
  }

  onGoBack() {
    this._navCtrl.navigateRoot('/home');
  }

  // private

  private async onRefresh() {
    this._interfacesFormGroups = {};
    await this.networkSvc.initialize();

    for (const _interfaceKey in this.networkSvc.networkInterfaces) {
      const _interface = this.networkSvc.networkInterfaces[_interfaceKey];

      this._interfacesFormGroups[_interfaceKey] = new FormGroup({
        address: new FormControl({ value: _interface.address, disabled: false }),
        netmask: new FormControl({ value: _interface.netmask, disabled: false }),
        gateway: new FormControl({ value: _interface.gateway, disabled: false }),
        wifi_ssid: new FormControl({ value: _interface._wpaSupplicantFile?.network?.ssid, disabled: false }),
        wifi_password: new FormControl({ value: _interface._wpaSupplicantFile?.network?.psk, disabled: false }),
      });
    }

    if (!this._selectedInterfaceKey || !this.networkSvc.networkInterfaces[this._selectedInterfaceKey]) {
      if (Object.keys(this.networkSvc.networkInterfaces).length > 0) {
        this.onSetSelectedInterface(Object.values(this.networkSvc.networkInterfaces)[0]);
      }
    }
    
  }

}
