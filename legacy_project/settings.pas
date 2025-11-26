unit settings;

{$mode objfpc}{$H+}

interface

uses
  Classes, inifiles, SysUtils, FileUtil, Forms, Controls, Graphics, Dialogs,
  StdCtrls, Buttons, Spin;

type

  { TForm3 }

  TForm3 = class(TForm)
    Button1: TBitBtn;
    Button2: TButton;
    Button3: TBitBtn;
    CheckBox1: TCheckBox;
    CheckBox2: TCheckBox;
    Edit1: TEdit;
    Edit2: TEdit;
    GroupBox1: TGroupBox;
    GroupBox2: TGroupBox;
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    OpenDialog1: TOpenDialog;
    procedure Button1Click(Sender: TObject);
    procedure Button2Click(Sender: TObject);
    procedure Button3Click(Sender: TObject);
    procedure CheckBox2Click(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormShow(Sender: TObject);
  private

  public

  end;

var
  IniF:TINIFile;
  Form3: TForm3;

implementation

{$R *.lfm}
 uses main;
{ TForm3 }

procedure TForm3.FormCreate(Sender: TObject);
begin
     Inif := TINIFile.Create(extractfilepath(paramstr(0))+'settings.ini');

     checkbox1.Checked:=StrToBool(inif.ReadString('updates','checking',''));

     checkbox2.Checked:=StrToBool(inif.ReadString('base','parrentfolder',''));
     if CheckBox2.Checked=true then edit2.Text:=ExtractFilePath(ParamStr(0))+'1.sqlite';
     inif.Free;

end;

//подсчет размера папки резервных копий
function GetDirSize(dir: string; subdir: Boolean): Longint;
var
   rec: TSearchRec;
   found: Integer;
begin
   Result := 0;
   //if dir[Length(dir)] <> '\' then dir := dir + '\';
   dir := IncludeTrailingPathDelimiter(dir);
   found := FindFirst(dir + '*.*', faAnyFile, rec);
   while found = 0 do
      begin
         Inc(Result, rec.Size);
         if (rec.Attr and faDirectory > 0) and (rec.Name[1] <> '.') and (subdir = True) then
            Inc(Result, GetDirSize(dir + rec.Name, True));
         found := FindNext(rec);
      end;
    sysUtils.FindClose(rec); //THIS IS THE LINE that needs to be/was changed to adapt to Lazarus/FreePascal
end;


procedure TForm3.FormShow(Sender: TObject);
var size_backups:int64;
begin
     size_backups:=GetDirSize(path_backups,true);
     case size_backups of
     0..1024: button3.Caption:='Видалити резервні копії ('+IntToStr(size_backups)+' bytes) ';
     1025..1048576: button3.Caption:='Видалити резервні копії ('+floatToStrf(size_backups/1024,ffFixed,5,2) +' Kb) ';
     1048577..1073741824:button3.Caption:='Видалити резервні копії ('+floatToStrf(size_backups/1024/1024,ffFixed,5,1)+' Mb) ';
     end;
     Button3.Caption:=Button3.Caption+IntToStr(FindAllFiles(path_backups,'*.*',false).Count)+' файли(-ів)';
end;

procedure TForm3.Button2Click(Sender: TObject);
begin
     OpenDialog1.Execute;
     if OpenDialog1.FileName<>path_program+'1.sqlite' then CheckBox2.Checked:=false
     else CheckBox2.Checked:=true;
     Edit2.Text:=OpenDialog1.FileName;
end;

//Удаление backup-ов
procedure TForm3.Button3Click(Sender: TObject);
begin
     if MessageDlg('Очистка', 'Видалити усі резервні копії бази?', mtConfirmation, [mbYes, mbNo],0) = mrYes then
     begin
          if DeleteDirectory(path_backups, True) then RemoveDir(path_backups);
          ShowMessage('Резервні копії бази видалені!');
          save_reserv;
          form3.FormShow(Self);
     end;
end;

//Сохранение настроек
procedure TForm3.Button1Click(Sender: TObject);
begin
     Inif:=TINIFile.Create('settings.ini');
     inif.WriteBool('Updates','checking',CheckBox1.Checked);
     inif.WriteString('Updates','link',edit1.Text);
     inif.WriteBool('Base','parrentfolder',CheckBox2.Checked);
     inif.WriteString('base','folder',edit2.Text);
     inif.WriteString('base','lastOS',form1.os);
     inif.Free;
     ShowMessage('Налаштування збережено!');
     close;
end;

procedure TForm3.CheckBox2Click(Sender: TObject);
begin
     if checkbox2.Checked then edit2.text:=path_program+'1.sqlite';
end;

end.

