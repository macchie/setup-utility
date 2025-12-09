import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonLabel, IonTitle, IonToolbar, IonButton, IonIcon, IonCard, NavController, IonList, IonItemDivider, IonItem, IonBadge, IonToggle, IonButtons, IonInput, IonCardContent, IonText, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, calendarOutline, checkmarkCircleOutline, closeOutline, createOutline, ellipse, ellipseOutline, pulseOutline, radioButtonOff, radioButtonOn, save, saveOutline, settingsOutline, wifiOutline, wifiSharp } from 'ionicons/icons';
import { CronService } from '../../services/cron-service';
import { NetworkService } from '../../services/network-service';

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

  get canSaveNetwork() {
    for (let key in this.networkSvc.networkInterfaces) {
      if (this.networkSvc.networkInterfaces[key]._formGroup.valid && this.networkSvc.networkInterfaces[key]._formGroup.dirty) {
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
    await this.networkSvc.initialize();
  }

  async onRefreshSection(_newSection: 'network' | 'dns' | 'proxy') {
    this.networkSvc.initialize();
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

  async onChangeSection(_newSection: 'network' | 'dns' | 'proxy') {
    if (this._section === _newSection) {
      return;
    }

    // if (!this._sections[this._section].dirty) {
    //   this._section = _newSection;
    //   return;
    // }

    const _alert = await this._alertCtrl.create({
      header: 'Change Section',
      message: 'Are you sure you want to change section? Unsaved changes will be lost.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Change',
          handler: () => {
            this._section = _newSection;
          }
        }
      ]
    });

    await _alert.present();
  }

  onGoBack() {
    this._navCtrl.navigateRoot('/home');
  }

}
