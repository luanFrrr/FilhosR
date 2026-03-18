const fs = require('fs');
let code = fs.readFileSync('client/src/pages/vaccine-card.tsx', 'utf8');

// Imports
code = code.replace(/import \{ compressImage, getTransformedImageUrl \} from \"@\/lib\/imageUtils\";\r?\n/, '');
code = code.replace(/import \{ PhotoPicker \} from \"@\/components\/ui\/photo-picker\";\r?\n/, '');
code = code.replace(/import \{ useUpload \} from \"@\/hooks\/use-upload\";\r?\n/, '');
code = code.replace(/import \{ LazyImage \} from \"@\/components\/ui\/lazy-image\";\r?\n/, '');
code = code.replace(/  Image,\r?\n/, '');
code = code.replace(/  Camera,\r?\n/, '');

// State
code = code.replace(/  const \[photoUrls, setPhotoUrls\] \= useState<string\[\]>\(\[\]\);\r?\n/, '');
code = code.replace(/  const \[newPhotoFiles, setNewPhotoFiles\] \= useState<File\[\]>\(\[\]\);\r?\n/, '');
code = code.replace(/  const \{ upload, isUploading: isUploadingToStorage \} = useUpload\(\);\r?\n/, '');
code = code.replace(/  const \[isUploading, setIsUploading\] = useState\(false\);\r?\n/, '');

// Effects resets
code = code.replace(/      setPhotoUrls\(editingRecord\.photoUrls \|\| \[\]\);\r?\n/, '');
code = code.replace(/    setPhotoUrls\(\[\]\);\r?\n    setNewPhotoFiles\(\[\]\);\r?\n/g, '');
code = code.replace(/        setPhotoUrls\(\[\]\);\r?\n        setNewPhotoFiles\(\[\]\);\r?\n/g, '');
code = code.replace(/            setPhotoUrls\(\[\]\);\r?\n            setNewPhotoFiles\(\[\]\);\r?\n/g, '');

// Functions
const imgFnRegex = /  const handleImageFile = async \([^]*?  };\r?\n\r?\n  const removePhoto = \([^]*?  };\r?\n\r?\n/g;
code = code.replace(imgFnRegex, '');

// Submit Logic
const uploadLogic = /    setIsUploading\(true\);\r?\n    try \{\r?\n      let currentPhotos = \[\.\.\.photoUrls\];\r?\n\r?\n      \/\/ Upload das novas fotos para o Supabase\r?\n      if \(newPhotoFiles\.length > 0\) \{\r?\n[^]*?        \];\r?\n      \}\r?\n/g;
code = code.replace(uploadLogic, '    try {\n');
code = code.replace(/    \} finally \{\r?\n      setIsUploading\(false\);\r?\n    \}\r?\n/g, '    }\n');

// Drop photoUrls from payloads
code = code.replace(/            photoUrls: null,\r?\n/g, '');
// For the 2 places with currentPhotos : null
const payloadPhotoRegex = /          photoUrls: currentPhotos\.length > 0 \? currentPhotos : null,\r?\n/g;
code = code.replace(payloadPhotoRegex, '');

// Camera icon in list
const listCameraRegex = /                              \{record\.photoUrls &&\r?\n                                record\.photoUrls\.length > 0 && \(\r?\n                                  <Camera className=\"w-3 h-3 text-muted-foreground ml-auto\" \/>\r?\n                                \)\}\r?\n/g;
code = code.replace(listCameraRegex, '');

// PhotoPicker UI
const photoPickerRegex = /            <div className=\"space-y-2\">\r?\n              <Label>Fotos do comprovante \(opcional\)<\/Label>\r?\n\r?\n              \{\(photoUrls\.length > 0 \|\| newPhotoFiles\.length > 0\) && \(\r?\n[^]*?              <\/PhotoPicker>\r?\n              <p className=\"text-\[10px\] text-muted-foreground text-center\">\r?\n                Dica: Você pode adicionar várias fotos do cartão de vacinação\.\r?\n              <\/p>\r?\n            <\/div>\r?\n\r?\n/g;
code = code.replace(photoPickerRegex, '');

// Save button 
code = code.replace(/disabled=\{isPending \|\| isUploading \|\| isUploadingToStorage\}/g, 'disabled={isPending}');
code = code.replace(/\{isUploading \|\| isUploadingToStorage\r?\n                \? \"Enviando fotos\.\.\.\"\r?\n                : isPending/g, '{isPending');

// Detail Record Views
const detailPhotoRegex = /                \{detailRecord\.photoUrls &&\r?\n                  detailRecord\.photoUrls\.length > 0 && \(\r?\n[^]*?                  \)\}\r?\n\r?\n                <div className=\"flex gap-2 pt-2\">/g;
code = code.replace(detailPhotoRegex, '                <div className="flex gap-2 pt-2">');

fs.writeFileSync('client/src/pages/vaccine-card.tsx', code);
