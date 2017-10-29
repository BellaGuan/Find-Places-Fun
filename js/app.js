"use strict";
//model
var initPlaces;

//地图viewModel
var map = new AMap.Map('map', {
    resizeEnable: true,
    mapStyle: 'amap://styles/whitesmoke'
});

var infoWindow = new AMap.AdvancedInfoWindow({
    offset: new AMap.Pixel(7, -30),
    isCustom:true,
    closeWhenClickMap:true,
    autoMove: true
});

//用knockout.js处理列表视图
function listViewModel() {
    var self = this,
        selectedPlaces = [];

    //设置默认城市
    self.city=ko.observable('广州');
    self.filter = ko.observable('');
    self.currentPlaces = ko.observableArray();

    //在地图上展示每个景点的标记
    self.createMarker = function(placesArray) {
        //清空上一次筛选的列表和标记
        hideMarkers(self.currentPlaces());
        self.currentPlaces([]);

        placesArray.forEach(function(place) {
            var marker = new AMap.Marker({
                icon: "img/marker-32.png",
                position: place.lngLat,
                map: map,
                title: place.name
            });
            //每个marker的带有自己的content，给infowindow调用setContent()
            marker.content = "<div style=\'padding:5px;\'><a target=_blank href='"
                + place.website + "'><img style=\'float:left;margin-right:10px;padding:5px;animation:mymove 2s 3;\'src='"
                + place.imgUrl + "'></a><div><h3>" + place.name + "</h3>score: "
                + place.rating + "\/10 </br>" + place.ratingSignals + " ratings</div></br><div style=\'clear:both;\'><q>"
                + place.textIntro + "</q></div></div>";

            //绑定点击事件
            marker.on("click", clicked);
            self.currentPlaces.push(marker);
        });

        //重置
        selectedPlaces = [];

        //自动调整地图视野以适合全部Marker
        map.setFitView();
    };


    //从foursquare获得初始数据，或根据用户输入城市获得该城市景点数据
    self.citySearch=function(){
        initPlaces=[];
        var placeUrl = "https://api.foursquare.com/v2/venues/explore?client_id=1W4MLPRUVL0SLTUVQQZZD3Y5NH1XXFHNFESDMKH4BIVBRRH2%20&client_secret=5UAP10PMGT4MVMPLSJ3TA5CHW00UX1A4B0K045HPHFOL4YHA%20&near="
            +self.city()+"&query=sights%20&limit=13&venuePhotos=1&v=20171027%20&m=foursquare";

        $.ajax({
                url: placeUrl,
                async: false
            })
            .done(function(data) {
                var items = data.response.groups[0].items;
                if(items.length===0){
                    alert('没找到该地区的景点，请输入其他地区');
                }
                items.forEach(function(item) {
                    initPlaces.push({
                        name: item.venue.name,
                        lngLat: [item.venue.location.lng, item.venue.location.lat],
                        rating: item.venue.rating,
                        ratingSignals: item.venue.ratingSignals,
                        website: item.tips[0].canonicalUrl,
                        textIntro: item.tips[0].text,
                        imgUrl: item.venue.photos.groups[0].items[0].prefix + "width150" + item.venue.photos.groups[0].items[0].suffix,
                    });
                });
            })
            .fail(function(errorMessage) {
                alert(errorMessage.responseJSON.meta.errorDetail);
            });
            //设置刚获得的景点数据
            self.createMarker(initPlaces);
    };
    self.citySearch();

    //筛选地点
    self.filterPlaces = function() {
        if (self.filter().length === 0) {
            return self.createMarker(initPlaces);
        } else {
            initPlaces.forEach(function(place) {
                //用place.name.indexOf(self.filter())>0只检出第一项
                if (place.name.indexOf(self.filter()) !== -1) {
                    selectedPlaces.push(place);
                }
            });
            return self.createMarker(selectedPlaces);
        }
    };

    //为列表每项绑定click事件
    self.clickItem = function(place) {
        clicked(place);
    };

    //按景点受欢迎程度从高到低排名
    self.sortPlacesByRatingSignals=function(){
        function compare(propertyName){
            return function(x1,x2){
                var a=x1[propertyName];
                var b=x2[propertyName];
                if(a<b){
                    return 1;
                }else if(a>b){
                    return -1;
                }else{
                    return 0;
                }
            }
        };
        initPlaces.sort(compare("ratingSignals"));
        self.createMarker(initPlaces);
    };
}
ko.applyBindings(new listViewModel());

//处理marker和list的click事件
function clicked(e) {
    if (e.target) {
        return showInfoWindow(e.target);
    } else {
        return showInfoWindow(e);
    }
};

//展示信息窗口
function showInfoWindow(thisMarker) {
    //设置信息窗口内容，打开信息窗口
    infoWindow.setContent(thisMarker.content);
    infoWindow.open(map, thisMarker.getPosition());
    //被点击的marker跳动
    thisMarker.setAnimation("AMAP_ANIMATION_BOUNCE");
    //通过计时器设定marker停止动画
    setTimeout(function() {
        thisMarker.setAnimation("AMAP_ANIMATION_NONE");
    }, 2000);
};

//隐藏标记
function hideMarkers(markers) {
    var i,len=markers.length;
    for (i = 0; i < len; i++) {
        markers[i].setMap(null);
    }
};