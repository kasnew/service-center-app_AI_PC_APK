unit newwork;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, sqldb, FileUtil, DateTimePicker, Forms, Controls, Graphics,
  Dialogs, ExtCtrls, StdCtrls, MaskEdit, Buttons,lazutf8;

type

  { TForm4 }

  TForm4 = class(TForm)
    Button1: TBitBtn;
    Button2: TBitBtn;
    DateTimePicker1: TDateTimePicker;
    Edit1: TEdit;
    Edit2: TEdit;
    Edit3: TEdit;
    Edit4: TMaskEdit;
    GroupBox1: TGroupBox;
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    Label4: TLabel;
    Label5: TLabel;
    Label6: TLabel;
    Memo1: TMemo;
    Memo2: TMemo;
    Panel1: TPanel;
    procedure Button1Click(Sender: TObject);
    procedure Button2Click(Sender: TObject);
    procedure Edit1KeyPress(Sender: TObject; var Key: char);
    procedure Edit1KeyUp(Sender: TObject);
    procedure Edit2KeyUp(Sender: TObject; var Key: Word);
    procedure FormShow(Sender: TObject);
  private

  public

  end;

var
  Form4: TForm4;

implementation

{$R *.lfm}
uses Main;
{ TForm4 }

procedure TForm4.FormShow(Sender: TObject);
begin
      button1.Enabled:=true;
      DateTimePicker1.Date:=date;
     memo1.Clear;
     memo2.Clear;
     //edit1.text:='0';
     edit2.Clear;
     edit4.Clear;

     Edit2.SetFocus;
end;
//закрыть
function convert_eng(s1:string):string;
var n:Integer;
  ch,new_ch:string;
begin
     convert_eng:='';
     for n:=1 to Length(s1) do
     begin
          ch:=copy(s1,n,1);
          case ch of
          'q','Q':new_ch:='й';'w','W':new_ch:='ц';'e','E':new_ch:='у';
          'r','R':new_ch:='к';'t','T':new_ch:='е';'y','Y':new_ch:='н';
          'u','U':new_ch:='г';'i','I':new_ch:='ш';'o','O':new_ch:='щ';
          'p','P':new_ch:='з';'a','A':new_ch:='ф';'s','S':new_ch:='і';
          'd','D':new_ch:='в';'f','F':new_ch:='а';'g','G':new_ch:='п';
          'h','H':new_ch:='р';'j','J':new_ch:='о';'k','K':new_ch:='л';
          'l','L':new_ch:='д';'z','Z':new_ch:='я';'x','X':new_ch:='ч';
          'c','C':new_ch:='с';'v','V':new_ch:='м';'b','B':new_ch:='и';
          'n','N':new_ch:='т';'m','M':new_ch:='ь';'[','{':new_ch:='х';
          ']','}':new_ch:='ї';';',':':new_ch:='ж';'''','"':new_ch:='э';
          ',','<':new_ch:='б';'.','>':new_ch:='ю';'`','~':new_ch:='''';
          else new_ch:=ch;
          end;
          if n=1 then new_ch:=UTF8UpperCase(new_ch);//lazutf8
          convert_eng:=convert_eng+new_ch;
     end;
end;

procedure TForm4.Button2Click(Sender: TObject);
begin
     form4.Close;
end;
//фильтр ввода цифр
procedure TForm4.Edit1KeyPress(Sender: TObject; var Key: char);
begin
  if not (Key in ['0'..'9', #8,#13,',','.'])then Key:=#0; {Фильтр ввода - только числа}
end;

//номер квитанции не может быть пустым, по умолчанию "0"
procedure TForm4.Edit1KeyUp(Sender: TObject);
begin
  if edit1.Text='' then edit1.text:='0';
end;

procedure TForm4.Edit2KeyUp(Sender: TObject; var Key: Word);
begin
    if (key=13) then
    begin
         key:=0;
         edit2.Text:=convert_eng(edit2.Text);
    end;
end;

procedure TForm4.Button1Click(Sender: TObject);
label 1;
begin
      if Length(edit4.Text)=10 then
      begin
        1:button1.Enabled:=false;
          form1.SQLQuery1.Append;
          form1.SQLQuery1.edit;
          if edit1.Text<>''then form1.SQLQuery1.FieldByName('Квитанция').AsString:=edit1.text;
          form1.SQLQuery1.FieldByName('Начало_ремонта').AsDateTime:=DateTimePicker1.Date;
          form1.SQLQuery1.FieldByName('Конец_ремонта').AsDateTime:=DateTimePicker1.Date;//Пока приемка - такая же как и начало ремонта
          form1.SQLQuery1.FieldByName('Имя_заказчика').Asstring:=edit2.text;
          if edit4.Text<>'' then form1.SQLQuery1.FieldByName('Телефон').AsString:=edit4.Text;
          if memo1.Text<>'' then form1.SQLQuery1.FieldByName('Наименование_техники').Asstring:=memo1.Text;
          if memo2.Text<>'' then form1.SQLQuery1.FieldByName('Описание_неисправности').Asstring:=memo2.Text;
          form1.SQLQuery1.FieldByName('Оплачено').AsBoolean:=false;
          form1.sQLQuery1.FieldByName('Перезвонить').AsBoolean:=false;
          form1.sQLQuery1.FieldByName('Состояние').AsInteger:=1;//В очереди
          form1.sQLQuery1.FieldByName('Выполнено').AsString:='Прийнято о '+TimeToStr(Now);
          //form1.SQLQuery1.fields.FieldByName('ID').Required:=false;

          form1.Sqlquery1.Post;// записываем данные
          form1.sqlquery1.ApplyUpdates;// отправляем изменения в базу
          form1.SQLTransaction1.Commit;
          form1.SQLQuery1.Active:=false;
          form1.SQLQuery1.Active:=true;
          form1.FormCreate(Self);
          form4.Close;
      end else if MessageDlg('Увага!','Не повний номер телефону! Продовжити додавання?', mtConfirmation, [mbYes, mbNo],0) = mrYes then goto 1;
end;

end.

