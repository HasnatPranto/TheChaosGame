import { Component } from '@angular/core';
import { Observable, of, interval } from 'rxjs';
import Konva from 'konva';
import { Point } from './point.model';
import { Circle } from 'konva/lib/shapes/Circle';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent{

  title = 'chaos_game';
  points = 0;
  static A:Point = new Point(745,50,3, '#db091e');
  static B = new Point(397.5,600,3, '#03a1fc');
  static C = new Point(1102.5,600,3, '#02de32');
  static currentPoint: Point;
  static layer = new Konva.Layer();
  ngOnInit(){

    var stage = new Konva.Stage({
      container: 'container',
      width: window.innerWidth,
      height: window.innerHeight*.83,
    });
    //var layer = new Konva.Layer();
    stage.add(AppComponent.layer);

    this.initializeBoard(AppComponent.layer);

    stage.on('click', function () {
      var pos = AppComponent.layer.getRelativePointerPosition();
      AppComponent.currentPoint = new Point(pos.x,pos.y,1.5,'black');

      var shape = new Konva.Circle({
        x: pos.x,
        y: pos.y,
        fill: 'black',
        radius: 1.5,
      });
      AppComponent.layer.add(shape);
    });
  }

  setPoint(p:Point, layer:any){
    var point = new Konva.Circle({
      x: p.x,
      y: p.y,
      radius:p.rad,
      fill: p.color,
    });
    layer.add(point);
  }

  initializeBoard(layer:any){

    this.setPoint(AppComponent.A,layer);
    this.setPoint(AppComponent.B,layer);
    this.setPoint(AppComponent.C,layer);

  }
  onClick(){
    var ticks= 2000;
    var newPoints= 0;
    const period = interval(2000);

    const run = period.subscribe(()=>{

      if(this.points==0){ this.points= 5;newPoints = this.points}

      if(this.points>70000){
        newPoints = 50000;
        run.unsubscribe();
      }
      else{
        newPoints += Math.floor(newPoints *1.125);
      };

      this.points= Math.floor(newPoints)+this.points;

      for (var n = 0; n < newPoints; n++) {

        var x = Math.floor((Math.random() * 1000)%3);
        if(x==0){
          var np = new Point((AppComponent.A.x+AppComponent.currentPoint.x)/2,(AppComponent.A.y+AppComponent.currentPoint.y)/2,1.5,AppComponent.A.color);
          AppComponent.currentPoint = np;
          this.setPoint(np, AppComponent.layer);
        }
        if(x==1){
          var np = new Point((AppComponent.B.x+AppComponent.currentPoint.x)/2,(AppComponent.B.y+AppComponent.currentPoint.y)/2,1.5,AppComponent.B.color);
          AppComponent.currentPoint = np;
          this.setPoint(np, AppComponent.layer);
        }
        if(x==2){
          var np = new Point((AppComponent.C.x+AppComponent.currentPoint.x)/2,(AppComponent.C.y+AppComponent.currentPoint.y)/2,1.5,AppComponent.C.color);
          AppComponent.currentPoint = np;
          this.setPoint(np, AppComponent.layer);
        }
      }
    })
  }
}
