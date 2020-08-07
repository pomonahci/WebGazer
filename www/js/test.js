
var a = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({video: { width: 1280, height: 720 }});
    // console.log(stream)
    const track = stream.getVideoTracks()[0];
    let imageCapture = new ImageCapture(track);
    console.log(imageCapture)
    imageCapture.takePhoto().then((blob) => {
        const newFile = new File([blob], "MyJPEG.jpg", { type: "image/jpeg" });
        console.log(newFile);
        EXIF.getData(newFile, function () {
            const make = EXIF.getAllTags(newFile);
            console.log("All data", make);
        });
    });
}

a();
