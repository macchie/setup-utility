import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { POSService } from './services/posservice';

import { 
  writeTextFile, 
  readTextFile, 
  BaseDirectory, 
  exists,
} from '@tauri-apps/plugin-fs';
import { CronService } from './services/cron-service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    IonApp, 
    IonRouterOutlet
  ],
})
export class AppComponent implements  OnInit {

  constructor(
    public posSvc: POSService
  ) {
  }

  async ngOnInit() {
    await this.posSvc.readConfiguration();
  }
  
}
