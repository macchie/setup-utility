import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonLabel, IonTitle, IonToolbar, IonButton, IonIcon, IonCard, NavController, IonList, IonItemDivider, IonItem, IonBadge, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, calendarOutline, closeOutline, createOutline, pulseOutline, settingsOutline } from 'ionicons/icons';
import { CronService } from '../../services/cron-service';

@Component({
  selector: 'app-scheduled-tasks',
  templateUrl: './scheduled-tasks.page.html',
  styleUrls: ['./scheduled-tasks.page.scss'],
  standalone: true,
  imports: [IonToggle, 
    CommonModule, 
    FormsModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonCard, 
    IonList, 
    IonItemDivider, 
    IonItem, 
    IonBadge,
    IonLabel,
    IonButton, 
    IonIcon, 
]
})
export class ScheduledTasksPage implements OnInit {

  constructor(
    public cronSvc: CronService,
    private _navCtrl: NavController,
  ) {
    addIcons({ 
      addOutline,
      calendarOutline,
      closeOutline,
      createOutline,
      settingsOutline
    });
  }

  async ngOnInit() {
    await this.cronSvc.initialize();
  }

  onGoBack() {
    this._navCtrl.navigateRoot('/home');
  }

}
