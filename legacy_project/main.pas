unit main;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, sqldb, db, fpcsvexport, mssqlconn, sqlite3conn, FileUtil,
  DateTimePicker, LR_DBSet, LR_Class, Forms, Controls, Graphics, Dialogs,
  StdCtrls, Menus, DBGrids, MaskEdit, Zakaz, Sklad, zlibar, Grids, Buttons,
  ExtCtrls, ComCtrls, Types, MouseAndKeyInput, Ipfilebroker, IniFiles, settings;

type

  { TForm1 }

  TForm1 = class(TForm)
    BitBtn1: TBitBtn;
    BitBtn3: TBitBtn;
    BitBtn4: TBitBtn;
    Button1: TBitBtn;
    Button2: TBitBtn;
    Button3: TBitBtn;
    Button4: TBitBtn;
    CheckBox1: TCheckBox;
    CheckBox2: TToggleBox;
    CheckBox3: TCheckBox;
    CheckBox4: TCheckBox;
    ComboBox1: TComboBox;
    ComboBox2: TComboBox;
    ComboBox3: TComboBox;
    CSVExporter1: TCSVExporter;
    DataSource1: TDataSource;
    DataSource2: TDataSource;
    DateTimePicker1: TDateTimePicker;
    DateTimePicker2: TDateTimePicker;
    DateTimePicker3: TDateTimePicker;
    DateTimePicker4: TDateTimePicker;
    DateTimePicker5: TDateTimePicker;
    DateTimePicker6: TDateTimePicker;
    DateTimePicker7: TDateTimePicker;
    DBGrid1: TDBGrid;
    DBGrid2: TDBGrid;
    Edit1: TEdit;
    Edit10: TEdit;
    Edit11: TEdit;
    Edit12: TEdit;
    Edit13: TEdit;
    Edit14: TEdit;
    Edit2: TEdit;
    Edit3: TEdit;
    Edit4: TEdit;
    Edit5: TEdit;
    Edit6: TEdit;
    frDBDataSet1: TfrDBDataSet;
    frReport1: TfrReport;
    GroupBox1: TGroupBox;
    GroupBox2: TGroupBox;
    GroupBox3: TGroupBox;
    GroupBox4: TGroupBox;
    GroupBox5: TGroupBox;
    GroupBox6: TGroupBox;
    GroupBox7: TGroupBox;
    GroupBox8: TGroupBox;
    ImageList1: TImageList;
    Label1: TLabel;
    Label10: TLabel;
    Label11: TLabel;
    Label12: TLabel;
    Label13: TLabel;
    Label14: TLabel;
    Label15: TLabel;
    Label19: TLabel;
    Label2: TLabel;
    Label20: TLabel;
    Label21: TLabel;
    Label22: TLabel;
    Label23: TLabel;
    Label24: TLabel;
    Label25: TLabel;
    Label26: TLabel;
    Label27: TLabel;
    Label28: TLabel;
    Label3: TLabel;
    Label4: TLabel;
    Label5: TLabel;
    Label6: TLabel;
    Label7: TLabel;
    Label8: TLabel;
    Label9: TLabel;
    LabeledEdit1: TLabeledEdit;
    LabeledEdit10: TLabeledEdit;
    LabeledEdit11: TLabeledEdit;
    LabeledEdit12: TLabeledEdit;
    LabeledEdit13: TLabeledEdit;
    LabeledEdit14: TLabeledEdit;
    LabeledEdit15: TLabeledEdit;
    LabeledEdit16: TLabeledEdit;
    LabeledEdit2: TLabeledEdit;
    LabeledEdit3: TLabeledEdit;
    LabeledEdit4: TLabeledEdit;
    LabeledEdit5: TLabeledEdit;
    LabeledEdit6: TLabeledEdit;
    LabeledEdit7: TLabeledEdit;
    LabeledEdit8: TLabeledEdit;
    LabeledEdit9: TLabeledEdit;
    MainMenu1: TMainMenu;
    MenuItem1: TMenuItem;
    MenuItem10: TMenuItem;
    MenuItem11: TMenuItem;
    MenuItem12: TMenuItem;
    MenuItem13: TMenuItem;
    MenuItem14: TMenuItem;
    MenuItem15: TMenuItem;
    MenuItem16: TMenuItem;
    MenuItem17: TMenuItem;
    MenuItem18: TMenuItem;
    MenuItem19: TMenuItem;
    MenuItem2: TMenuItem;
    MenuItem20: TMenuItem;
    MenuItem21: TMenuItem;
    MenuItem22: TMenuItem;
    MenuItem23: TMenuItem;
    MenuItem24: TMenuItem;
    MenuItem25: TMenuItem;
    MenuItem26: TMenuItem;
    MenuItem27: TMenuItem;
    MenuItem28: TMenuItem;
    MenuItem29: TMenuItem;
    MenuItem3: TMenuItem;
    MenuItem4: TMenuItem;
    MenuItem5: TMenuItem;
    MenuItem6: TMenuItem;
    MenuItem7: TMenuItem;
    MenuItem8: TMenuItem;
    MenuItem9: TMenuItem;
    OpenDialog1: TOpenDialog;
    PageControl1: TPageControl;
    PopupMenu1: TPopupMenu;
    RadioButton1: TRadioButton;
    RadioButton2: TRadioButton;
    RadioButton3: TRadioButton;
    RadioButton4: TRadioButton;
    RadioButton5: TRadioButton;
    RadioButton6: TRadioButton;
    RadioGroup1: TRadioGroup;
    SQLite3Connection1: TSQLite3Connection;
    SQLQuery1: TSQLQuery;
    SQLQuery2: TSQLQuery;
    SQLQuery3: TSQLQuery;
    SQLQuery4: TSQLQuery;
    SQLQuery5: TSQLQuery;
    SQLQuery6: TSQLQuery;
    SQLTransaction1: TSQLTransaction;
    TabSheet1: TTabSheet;
    TabSheet2: TTabSheet;
    Timer1: TTimer;
    procedure BitBtn1Click(Sender: TObject);
    procedure BitBtn3Click(Sender: TObject);
    procedure BitBtn4Click(Sender: TObject);
    procedure Button1Click(Sender: TObject);
    procedure Button2Click(Sender: TObject);
    procedure Button3Click(Sender: TObject);
    procedure Button4Click(Sender: TObject);
    procedure CheckBox2Click(Sender: TObject);
    procedure CheckBox5Click(Sender: TObject);
    procedure ComboBox1Change(Sender: TObject);
    procedure ComboBox3Change(Sender: TObject);
    procedure DBGrid1CellClick();
    procedure DBGrid1DblClick(Sender: TObject);
    procedure DBGrid1DrawColumnCell(Sender: TObject; const Rect: TRect;
      DataCol: Integer; Column: TColumn; State: TGridDrawState);
    procedure DBGrid1KeyDown(Sender: TObject; var Key: Word);
    procedure DBGrid1MouseDown(Sender: TObject; Button: TMouseButton);
    procedure DBGrid1PrepareCanvas(sender: TObject);
    procedure Edit1Change(Sender: TObject);
    procedure Edit1KeyPress(Sender: TObject; var Key: char);
    procedure FormCreate(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure MenuItem10Click(Sender: TObject);
    procedure MenuItem11Click(Sender: TObject);
    procedure MenuItem12Click(Sender: TObject);
    procedure MenuItem13Click(Sender: TObject);
    procedure MenuItem15Click(Sender: TObject);
    procedure MenuItem17Click(Sender: TObject);
    procedure MenuItem19Click(Sender: TObject);
    procedure MenuItem20Click(Sender: TObject);
    procedure MenuItem22Click(Sender: TObject);
    procedure MenuItem24Click(Sender: TObject);
    procedure MenuItem25Click(Sender: TObject);
    procedure MenuItem26Click(Sender: TObject);
    procedure MenuItem27Click(Sender: TObject);
    procedure MenuItem28Click(Sender: TObject);
    procedure MenuItem29Click(Sender: TObject);
    procedure MenuItem2Click(Sender: TObject);
    procedure MenuItem3Click(Sender: TObject);
    procedure MenuItem4Click(Sender: TObject);
    procedure MenuItem5Click(Sender: TObject);
    procedure MenuItem6Click(Sender: TObject);
    procedure MenuItem9Click(Sender: TObject);
    procedure RadioButton1Click(Sender: TObject);
    procedure RadioButton2Click(Sender: TObject);
    procedure RadioButton3Click(Sender: TObject);
    procedure Timer1Timer(Sender: TObject);

  private

  public

    ID_remont,rec_pos,numberreport,predohranitel:integer;
    os,basename:string;

  end;

var
  MaxRect: TRect;
  Form1: TForm1;
  ID_edit,last_NUM, NewTop, NewHeight,koef_heith:integer;
  new_record,autoupdate,trigger_form:boolean;
  IniF:TINIFile;
  path_program,path_backups:string;
  gotivka, kartka: double;
  procedure finstat;
  procedure state_count;
  procedure find;
  procedure size_columns;
  procedure size_columns2;
  procedure rem_connect;
  procedure kasa_connect;
  procedure save_reserv;


implementation
 uses newwork;
{$R *.lfm}

{ TForm1 }

//архивирование базы данных
procedure save_reserv;
var
  Time:Tdatetime;
  Zar: TZlibWriteArchive;
  Stream: TMemoryStream;
  s:string;
begin
  Stream := TMemoryStream.Create;
  Zar := TZlibWriteArchive.Create;
  Zar.OutStream := Stream;
  Time:=now();
  Zar.InputFiles.Add(form1.basename);
  Zar.CreateArchive;

  if form1.os='windows' then s:=ExtractFilePath(ParamStr(0))+'\backup_database'
  else s:=ExtractFilePath(ParamStr(0))+'/backup_database';

  if ForceDirectories(s)=false then CreateDir(s);

  if form1.os='windows' then s:=s+'\' else s:=s+'/';

  Stream.SaveToFile(s+FormatDatetime('yy.MM.dd.hh.mm.ss',Time)+'.chip');

  Zar.Free;
  Stream.Free;

end;
//размер колонок таблицы
procedure size_columns;
begin
     with form1.DBGrid1 do
      begin
          Width:=form1.Width;
          Columns[0].Width:=0;//ID
          Columns[1].Width:=0;//Стоимость - чистая работа
          Columns[2].Width:=0;//Описание неисправности
          Columns[3].Width:=0;//Выполненая работа
          Columns[4].Width:=65;//Квитанция
          Columns[4].Title.Caption := 'Квитанція';
          Columns[5].Width:=form1.Width-820;//Наименование техники
          Columns[5].Title.Caption := 'Найменування техніки';
          Columns[6].Width:=105;//Имя
          Columns[6].Title.Caption := 'Ім''я клієнта';
          Columns[7].Width:=105;//Телефон
          Columns[7].DisplayFormat := '###-###-##-##';
          Columns[8].Width:=105;//Начало ремонта
          Columns[8].Title.Caption := 'Початок ремонту';
          Columns[9].Width:=95;//Конец ремонта
          Columns[9].Title.Caption := 'Кінець ремонту';
          Columns[10].Width:=50;//Сумма
          Columns[10].Title.Caption := 'Сума';
          Columns[11].Width:=0;//Оплачено
          Columns[12].Width:=120;//Примечание
          Columns[12].Title.Caption := 'Примітки';
          Columns[13].Width:=0;//Перезвонить
          Columns[14].Width:=0;//Доход
          Columns[15].Width:=130;//Состояние
          Columns[15].Title.Caption := 'Стан';
      end;
end;
procedure size_columns2;
begin
     with form1.DBGrid2 do
      begin
          Width:=form1.Width;
          Columns[0].Width:=0;//ID
          Columns[1].Width:=100;//Дата створення
          Columns[2].Width:=0;//Дата виконання
          Columns[3].Width:=65;//Категорія
          Columns[4].Width:=290;//Опис
          Columns[5].Width:=40;// Сума
          Columns[6].Width:=45;//Готівка
          Columns[7].Width:=45;//Картка
      end;
end;
//подключение к базе данных
procedure rem_connect;
begin
      form1.SQLQuery1.Active:=false;
      form1.SQLQuery1.Sql.Clear;
      form1.SQLQuery1.SQL.add('select ID,  Стоимость, Описание_неисправности, Выполнено, Квитанция, Наименование_техники, Имя_заказчика, Телефон, Начало_ремонта, Конец_ремонта, Сумма, Оплачено, Примечание, Перезвонить, Доход, Состояние from Ремонт ORDER BY Начало_ремонта DESC, Квитанция DESC');

      form1.SQLQuery1.Active:=true;
      size_columns;
      form1.SQLQuery1.First;
      last_NUM:=form1.SQLQuery1.FieldByName('Квитанция').AsInteger;
      form1.GroupBox1.Caption:='Список техніки ['+inttostr(form1.SQLQuery1.RecordCount)+']';
end;
//подключение к базе данных
procedure kasa_connect;
begin
      form1.SQLQuery5.Active:=false;
      form1.SQLQuery5.Sql.Clear;
      form1.SQLQuery5.SQL.add('select ID, Дата_створення, Дата_виконання, Категорія, Опис, Сума, Готівка, Карта from Каса ORDER BY Дата_створення DESC');

      form1.SQLQuery5.Active:=true;
      size_columns2;
      form1.SQLQuery5.First;
      gotivka:=form1.SQLQuery5.FieldByName('Готівка').AsFloat;
      kartka:=form1.SQLQuery5.FieldByName('Карта').AsFloat;
      form1.LabeledEdit7.Text:=floattostr(gotivka);
      form1.LabeledEdit8.Text:=floattostr(kartka);
end;
//вывод фин статистика за выбранный период
procedure finstat;
var Year, Month, Day: Word;
//dohid:double;
begin
   // підрахунок "Витрат" за активний місяць
        form1.sqlQuery6.Active:=false;
        form1.sqlQuery6.SQL.Clear;
        form1.sqlQuery6.SQL.Add('Select sum(Сума) from Каса where Категорія=''Витрата''');
        DecodeDate(Now, Year, Month, Day);
        form1.SQLQuery6.SQL.Add(' and Дата_створення>=:date3 and Дата_створення<=:date4');
        form1.sqlQuery6.ParamByName('date3').AsDate:=EncodeDate(Year, Month, 1);
        form1.sqlQuery6.ParamByName('date4').AsDate:=now;
        form1.sqlQuery6.Active:=true;
        if form1.sqlQuery6.Fields[0].Value<>null then form1.LabeledEdit15.Text:=floattostr(form1.sqlQuery6.Fields[0].Value)
        else form1.LabeledEdit15.Text:='0';
        //form1.LabeledEdit16.Text:=floattostr(dohid-strtofloat(form1.LabeledEdit15.Text));


  // подсчет финансовой статистики по дате с расходниками и чистой работы, и додхода с расходников
        form1.sqlQuery2.Active:=false;
        form1.sqlQuery2.SQL.Clear;
        form1.sqlQuery2.SQL.Add('Select sum(Стоимость), sum(Сумма), sum(Доход)  from Ремонт where Оплачено=:sost');
        form1.sqlQuery2.ParamByName('sost').Value:=true;

        if form1.RadioButton4.Checked=true then //сегодня
        begin
             form1.SQLQuery2.SQL.Add(' and Конец_ремонта=:date');
             form1.sqlQuery2.ParamByName('date').AsDate:=Date;
        end else
        if form1.RadioButton5.Checked=true then //текущий месяц
        begin
              DecodeDate(Now, Year, Month, Day);
              form1.SQLQuery2.SQL.Add(' and (Конец_ремонта>=:date1 and Конец_ремонта<=:date2)');
              form1.sqlQuery2.ParamByName('date1').AsDate:=EncodeDate(Year, Month, 1);
              form1.sqlQuery2.ParamByName('date2').AsDate:=date;
        end else
        if form1.RadioButton6.Checked=true then //выбранный период
        begin
              form1.SQLQuery2.SQL.Add(' and (Конец_ремонта>=:date1 and Конец_ремонта<=:date2)');
              form1.sqlQuery2.ParamByName('date1').AsDate:=form1.DateTimePicker5.Date;
              form1.sqlQuery2.ParamByName('date2').AsDate:=form1.DateTimePicker6.Date;
        end;

        form1.sqlQuery2.Active:=true;

        //вывод фин статистики
        if form1.sqlQuery2.Fields[0].Value<>null then form1.Edit10.Text:=floattostr(form1.sqlQuery2.Fields[0].Value)
        else form1.edit10.Text:='0';

        if form1.sqlQuery2.Fields[1].Value<>null then form1.Edit11.Text:=floattostr(form1.sqlQuery2.Fields[1].Value)
        else form1.edit11.Text:='0';

        if form1.sqlQuery2.Fields[2].Value<>null then form1.Edit12.Text:=FloatToStr(trunc(form1.sqlQuery2.Fields[2].AsFloat*100)/100)
        else form1.edit12.Text:='0';

        form1.Edit13.Text:=FloatToStrf(strtofloat(form1.edit10.text)+strtofloat(form1.edit12.text),ffFixed,8,2);

        if form1.RadioButton5.Checked=true then //текущий месяц
        begin
             form1.LabeledEdit16.Visible:=true;
             form1.LabeledEdit16.Text:=floattostr(strtofloat(form1.edit13.text)-strtofloat(form1.LabeledEdit15.text));
        end else form1.LabeledEdit16.Visible:=false;
end;
//подсчет состояний квитанций
procedure state_count;
begin
        form1.sqlQuery3.Active:=false;
        form1.sqlQuery3.SQL.Clear;
        form1.sqlQuery3.SQL.Add('SELECT COUNT(*) as count FROM Ремонт WHERE Состояние=1');
        form1.sqlQuery3.Active:=true;
        form1.LabeledEdit1.Text:=inttostr(form1.SQLQuery3.Fields[0].Value);

        form1.sqlQuery3.Active:=false;
        form1.sqlQuery3.SQL.Clear;
        form1.sqlQuery3.SQL.Add('SELECT COUNT(*) as count FROM Ремонт WHERE Состояние=2');
        form1.sqlQuery3.Active:=true;
        form1.LabeledEdit2.Text:=inttostr(form1.SQLQuery3.Fields[0].Value);

        form1.sqlQuery3.Active:=false;
        form1.sqlQuery3.SQL.Clear;
        form1.sqlQuery3.SQL.Add('SELECT COUNT(*) as count FROM Ремонт WHERE Состояние=3');
        form1.sqlQuery3.Active:=true;
        form1.LabeledEdit3.Text:=inttostr(form1.SQLQuery3.Fields[0].Value);

        form1.sqlQuery3.Active:=false;
        form1.sqlQuery3.SQL.Clear;
        form1.sqlQuery3.SQL.Add('SELECT COUNT(*) as count FROM Ремонт WHERE Состояние=4');
        form1.sqlQuery3.Active:=true;
        form1.LabeledEdit4.Text:=inttostr(form1.SQLQuery3.Fields[0].Value);

        form1.sqlQuery3.Active:=false;
        form1.sqlQuery3.SQL.Clear;
        form1.sqlQuery3.SQL.Add('SELECT COUNT(*) as count FROM Ремонт WHERE Состояние=5');
        form1.sqlQuery3.Active:=true;
        form1.LabeledEdit5.Text:=inttostr(form1.SQLQuery3.Fields[0].Value);

        form1.sqlQuery3.Active:=false;
        form1.sqlQuery3.SQL.Clear;
        form1.sqlQuery3.SQL.Add('SELECT COUNT(*) as count FROM Ремонт WHERE Состояние=7');
        form1.sqlQuery3.Active:=true;
        form1.LabeledEdit6.Text:=inttostr(form1.SQLQuery3.Fields[0].Value);
end;

//включение фильтров поиска
procedure find;
begin
     if form1.CheckBox2.Checked=true then
     begin

         //обманка - по сути вывод полного списка, к которому будем добавлять фильтры
           form1.SQLQuery1.Active:=false;
           form1.SQLQuery1.SQL.Clear;
           form1.SQLQuery1.SQL.add('select ID,  Стоимость, Описание_неисправности, Выполнено, Квитанция, Наименование_техники, Имя_заказчика, Телефон, Начало_ремонта, Конец_ремонта, Сумма, Оплачено, Примечание, Перезвонить, Доход, Состояние from Ремонт where ID>=0');

           //фильтр "возвраты", если включен, то остальные не нужны
           if form1.CheckBox1.checked=true then form1.SQLQuery1.SQL.add(' and Сумма<0') else
           //фильтр "Состояние", если включен то остальные игнорируются
           if form1.ComboBox1.ItemIndex>=0 then
              begin
                   form1.SQLQuery1.SQL.add(' and Состояние=:sost4');
                   form1.SQLQuery1.Params.ParamByName('sost4').AsInteger:=form1.ComboBox1.ItemIndex;
              end
                   else
           //фильтр "перезвонить", если включен, то остальные фильтры не нужны
           if form1.checkbox3.Checked=true then
                begin
                     form1.SQLQuery1.SQL.add(' and Перезвонить=:sost3');
                     form1.SQLQuery1.Params.ParamByName('sost3').Value:=true;
                end
                     else
                begin
                     //----------------------------------------------------------------
                     //определение состояния оплаты
                     //если нужны только оплаченные, то дополнительные фильтры
                     if form1.RadioButton2.Checked=True then
                     begin
                          form1.SQLQuery1.SQL.add(' AND Оплачено=:sost');
                          form1.SQLQuery1.ParamByName('sost').AsBoolean:=true;
                          form1.SQLQuery1.SQL.Add(' and (Конец_ремонта>=:date3 and Конец_ремонта<=:date4)');
                          form1.SQLQuery1.ParamByName('date3').AsDate:=form1.DateTimePicker3.Date;
                          form1.SQLQuery1.ParamByName('date4').AsDate:=form1.DateTimePicker4.Date;
                     end
                     else
                     if form1.RadioButton3.Checked=True then
                     begin
                          //если нужны не оплаченные то по дате поступления
                          form1.SQLQuery1.SQL.add(' AND Оплачено=:sost');
                          form1.SQLQuery1.ParamByName('sost').AsBoolean:=false;
                          form1.SQLQuery1.SQL.Add(' and (Начало_ремонта>=:date1 and Начало_ремонта<=:date2)');
                          form1.SQLQuery1.ParamByName('date1').AsDate:=form1.DateTimePicker1.Date;
                          form1.SQLQuery1.ParamByName('date2').AsDate:=form1.DateTimePicker2.Date;
                     end;
                     //---------------------------------------------------------------
                     if form1.Edit2.Text<>'' then form1.SQLQuery1.SQL.add(' and Имя_заказчика LIKE'''+'%'+form1.edit2.text+'%'+'''');
                     if form1.Edit1.Text<>'' then form1.SQLQuery1.SQL.add(' and Квитанция='+form1.edit1.text);
                     if form1.Edit3.Text<>'' then form1.SQLQuery1.SQL.add(' and Телефон LIKE'''+'%'+form1.edit3.text+'%'+'''');
                     if form1.Edit4.Text<>'' then form1.SQLQuery1.SQL.add(' and Наименование_техники LIKE'''+'%'+form1.edit4.text+'%'+'''');
                     if form1.Edit5.Text<>'' then form1.SQLQuery1.SQL.add(' and Сумма='+form1.edit5.text);
                     if form1.Edit6.Text<>'' then form1.SQLQuery1.SQL.add(' and Примечание LIKE'''+'%'+form1.edit6.text+'%'+'''');
                end;
           form1.SQLQuery1.SQL.add(' ORDER BY Начало_ремонта DESC, Квитанция DESC');

           form1.SQLQuery1.Active:=true;

           if form1.SQLQuery1.RecordCount=0 then begin
                                                      rem_connect;
                                                 end else
           form1.GroupBox1.Caption:='Список техники ['+inttostr(form1.SQLQuery1.RecordCount)+']';

           size_columns;
     end;
end;

//кнопка "выход"
procedure TForm1.Button3Click(Sender: TObject);
begin
     form1.Close;
end;
//добавление квитанции
procedure TForm1.Button1Click(Sender: TObject);
begin
     SQLQuery1.First;
     form4.edit1.Text:=inttostr(last_NUM+1);
     Form4.ShowModal;
end;

//додавання операцій в касу
procedure TForm1.BitBtn1Click(Sender: TObject);
begin
with form1.SQLQuery5 do
      begin
          Append;
          Edit;
          FieldByName('Дата_створення').AsDateTime:=now;
          FieldByName('Дата_виконання').AsDateTime:=DateTimePicker7.Date;
          FieldByName('Категорія').Asstring:=ComboBox2.Text;
          FieldByName('Сума').Asfloat:=StrToInt(LabeledEdit9.Text);
           if CheckBox4.Checked=true then
          begin
               if ComboBox2.Text='Прибуток' then
               begin
                    FieldByName('Опис').Asstring:='Сплата карткою/безнал. '+LabeledEdit10.Text;
                    FieldByName('Карта').Asfloat:=kartka+StrToFloat(LabeledEdit9.Text);
                    FieldByName('Готівка').Asfloat:=gotivka;
               end else
               begin
                    FieldByName('Опис').Asstring:=ComboBox2.Text+' карткою. '+LabeledEdit10.Text;
                    FieldByName('Карта').Asfloat:=kartka-StrToFloat(LabeledEdit9.Text);
                    FieldByName('Готівка').Asfloat:=gotivka;
               end;
          end
          else
          begin
               if ComboBox2.Text='Прибуток' then
               begin
                    FieldByName('Опис').Asstring:='Сплата готівкою. '+LabeledEdit10.Text;
                    FieldByName('Готівка').Asfloat:=gotivka+StrToFloat(LabeledEdit9.Text);
                    FieldByName('Карта').Asfloat:=kartka;

               end else
               begin
                    FieldByName('Опис').Asstring:=ComboBox2.Text+' готівкою. '+LabeledEdit10.Text;
                    FieldByName('Готівка').Asfloat:=gotivka-StrToFloat(LabeledEdit9.Text);
                    FieldByName('Карта').Asfloat:=kartka;
               end;
          end;
          Post;// записываем данные
          ApplyUpdates;// отправляем изменения в базу
      end;
      form1.combobox3.ItemIndex:=0;
      form1.LabeledEdit9.Text:='0';
      form1.LabeledEdit10.Clear;
      form1.CheckBox4.Checked:=false;
      form1.SQLTransaction1.Commit;
    //  form1.SQLQuery1.Active:=false;
    //  form1.SQLQuery1.Active:=true;
      form1.FormCreate(Self);
end;
//частковий перевод безготівки в готівку
procedure TForm1.BitBtn3Click(Sender: TObject);
begin
   combobox2.ItemIndex:=0;
   CheckBox4.Checked:=false;
   LabeledEdit9.Text:=LabeledEdit12.Text;
   LabeledEdit13.text:='0';
   kartka:=kartka-StrToFloat(LabeledEdit11.Text);
   LabeledEdit8.Text:=FloatToStr(kartka);
   LabeledEdit10.Text:='Перевод з картки/безналу. Сума '+LabeledEdit11.Text+'. ';
   LabeledEdit11.text:='0';
   LabeledEdit12.text:='0';
   BitBtn1Click(Self);
end;

//перевод усієї безготівки в готівку
procedure TForm1.BitBtn4Click(Sender: TObject);
begin
  combobox2.ItemIndex:=0;
  CheckBox4.Checked:=false;
  LabeledEdit9.Text:=LabeledEdit13.Text;
  LabeledEdit13.text:='0';
  LabeledEdit10.Text:='Перевод з картки/безналу. Сума '+LabeledEdit8.Text+'. ';
  LabeledEdit8.Text:='0';
  kartka:=0;
  BitBtn1Click(Self);
end;

//удаление квитанции
procedure TForm1.Button2Click(Sender: TObject);
begin
     if MessageDlg('Видалення квитанції', 'Видалити запис?', mtConfirmation, [mbYes, mbNo],0) = mrYes then
     begin
            SQLQuery2.Active:=false;
            SQLQuery2.SQL.Clear;
            SQLQuery2.SQL.Add('Update Расходники set №_квитанции=0, Наличие=:sost, Квитанция=0 where Квитанция=:delete');
            SQLQuery2.ParamByName('delete').AsInteger:=ID_remont;
            SQLQuery2.ParamByName('sost').AsBoolean:=true;
            SQLQuery2.ExecSQL;

            SQLQuery1.Delete;//удаление выделенной записи из базы "Услуги"
            sqlquery1.ApplyUpdates;// отправляем изменения в базу
            SQLTransaction1.Commit;//без этого не работает

            rem_connect;
            finstat;//пересчет финансовой статистики
      end;
end;

//очистка фильтров поиска
procedure TForm1.Button4Click(Sender: TObject);
begin
     if CheckBox2.Checked=true then
     begin
          CheckBox2.Checked:=false;
          rem_connect;
     end;
     CheckBox1.Checked:=false;
     checkbox3.Checked:=false;
     edit1.Text:='';edit2.Text:='';edit3.Text:='';edit4.Text:='';edit5.Text:='';edit6.Text:='';
     RadioButton1.Checked:=true;
     DateTimePicker1.Date:=date;
     DateTimePicker2.Date:=date;
     DateTimePicker3.Date:=date;
     DateTimePicker4.Date:=date;
     ComboBox1.ItemIndex:=-1;
end;

//включение фильтра поиска
procedure TForm1.CheckBox2Click(Sender: TObject);
begin
     if form1.CheckBox2.Checked=true then
     begin
          find;
          GroupBox2.Color:=clGray;
          CheckBox2.Color:=clRed;
     end
     else
     begin
          rem_connect;
          GroupBox2.Color:=$00C08080;
          CheckBox2.Color:=clDefault;
     end;
end;

//включение статистики
procedure TForm1.CheckBox5Click(Sender: TObject);
begin
     finstat;
end;
//Автопоиск по Состоянию
procedure TForm1.ComboBox1Change(Sender: TObject);
begin
     form1.CheckBox2.Checked:=true;
     find;
     GroupBox2.Color:=clGray;
end;
//фільтр операцій
procedure TForm1.ComboBox3Change(Sender: TObject);
begin
     //обманка - по сути вывод полного списка, к которому будем добавлять фильтры
           form1.SQLQuery5.Active:=false;
           form1.SQLQuery5.SQL.Clear;
           form1.SQLQuery5.SQL.add('select ID, Дата_створення, Дата_виконання, Категорія, Опис, Сума, Готівка, Карта from Каса where ID>=0 ');
           if (combobox3.text<>'Усі')or(length(form1.LabeledEdit14.text)>0) then
           begin
                if (combobox3.text<>'Усі') then form1.SQLQuery5.SQL.add(' AND Категорія='''+combobox3.text+''' ');
                if length(form1.LabeledEdit14.text)>0 then form1.SQLQuery5.SQL.add(' AND Опис LIKE '''+'%'+LabeledEdit14.text+'%'+'''');
                form1.SQLQuery5.SQL.add(' ORDER BY Дата_створення DESC');
           end else kasa_connect;

           form1.SQLQuery5.Active:=true;

           if form1.SQLQuery5.RecordCount=0 then kasa_connect;

           size_columns2;
end;

//получиние ID выбранной записи
procedure TForm1.DBGrid1CellClick();
var phone_str:string;
begin
     if SQLQuery1.RecordCount<>0 then
     ID_remont:=SQLQuery1.FieldValues['ID'];
     rec_pos:=SQLQuery1.RecNo;
     //показ номера телефона через дефис
     phone_str:=SQLQuery1.FieldByName('Телефон').Asstring;
     phone_str:=copy(phone_str,0,3)+'-'+copy(phone_str,4,3)+'-'+copy(phone_str,7,2)+'-'+copy(phone_str,9,2);
     DBGrid1.Hint:=phone_str;
end;

//открытие квитанции
procedure TForm1.DBGrid1DblClick(Sender: TObject);
begin
     Form2.ShowModal;
end;
//Подмена столбца "Состояние"
procedure TForm1.DBGrid1DrawColumnCell(Sender: TObject; const Rect: TRect;
  DataCol: Integer; Column: TColumn; State: TGridDrawState);
var PhoneNumber: string;
begin
     //          if Field.Name = 'Телефон' then TFloatField(Field):='###,###, ##, ##000-000-00-00';
     if Column.FieldName = 'Телефон' then
  begin
    PhoneNumber := SQLQuery1.FieldByName('Телефон').AsString;
    if Length(PhoneNumber) = 10 then
    begin
      PhoneNumber := Copy(PhoneNumber, 1, 3) + '-' + Copy(PhoneNumber, 4, 3) + '-' + Copy(PhoneNumber, 7, 2) + '-' + Copy(PhoneNumber, 9, 2);
      DBGrid1.Canvas.FillRect(Rect);
      DBGrid1.Canvas.TextOut(Rect.Left + 2, Rect.Top + 2, PhoneNumber);
    end;
  end;
     if Column.FieldName = 'Состояние' then
     with DBGrid1.Canvas do
     begin
          case SQLQuery1.FieldByName('Состояние').Value of
          0:begin TextOut(Rect.Right-2-DBGrid1.Canvas.TextWidth('       '),Rect.Top+2,'       ');end;
          1:begin TextOut(Rect.Right-2-DBGrid1.Canvas.TextWidth('У черзі'),Rect.Top+2,'У черзі');end;
          2:begin TextOut(Rect.Right-2-DBGrid1.Canvas.TextWidth('У роботі'),Rect.Top+2,'У роботі');end;
          3:begin TextOut(Rect.Right-2-DBGrid1.Canvas.TextWidth('Очікув. відпов./деталі'),Rect.Top+2,'Очікув. відпов./деталі');end;
          4:begin TextOut(Rect.Right-2-DBGrid1.Canvas.TextWidth('Готовий до видачі'),Rect.Top+2,'Готовий до видачі');end;
          5:begin TextOut(Rect.Right-2-DBGrid1.Canvas.TextWidth('Не додзвонилися'),Rect.Top+2,'Не додзвонилися');end;
          6:begin TextOut(Rect.Right-2-DBGrid1.Canvas.TextWidth('       '),Rect.Top+2,'       ');end;
          7:begin TextOut(Rect.Right-2-DBGrid1.Canvas.TextWidth('Одеса'),Rect.Top+2,'Одеса');end;
          end;
     end;
end;

//удаление квитанции кнопкой "Delete"
procedure TForm1.DBGrid1KeyDown(Sender: TObject; var Key: Word);
begin
      if key = 46 then Button2.Click;
end;
//выделение правым кликом
procedure TForm1.DBGrid1MouseDown(Sender: TObject; Button: TMouseButton);
begin
  if Button = mbRight then MouseInput.Click(mbLeft,[],Mouse.CursorPos.X,Mouse.CursorPos.Y);
end;

//закраска таблицы
procedure TForm1.DBGrid1PrepareCanvas(sender: TObject);
begin
      //Полосатая заливка
      if odd(TDBGrid(Sender).DataSource.Dataset.RecNo) then TDBGrid(Sender).Canvas.Brush.Color :=RGBToColor(161,161,161);
      //красим оплаченные
      IF TDBGrid(Sender).DataSource.DataSet.FieldByName('Оплачено').AsBoolean = true then TDBGrid(Sender).Canvas.Brush.Color:=RGBToColor(46,139,87);
      //Красим "Позвонить"
      IF TDBGrid(Sender).DataSource.DataSet.FieldByName('Перезвонить').AsBoolean = true then TDBGrid(Sender).Canvas.Brush.Color:=RGBToColor(255,69,0);
      //Красим "Возвраты"
      IF TDBGrid(Sender).DataSource.DataSet.FieldByName('Сумма').AsFloat <0 then TDBGrid(Sender).Canvas.Brush.Color:=RGBToColor(116,137,202);
end;
//Отключение фильтров при их редактировании
procedure TForm1.Edit1Change(Sender: TObject);
begin
  if CheckBox2.Checked=true then
      begin
          CheckBox2.Checked:=false;
          rem_connect;
      end;
end;

//активация поиска по Enter
procedure TForm1.Edit1KeyPress(Sender: TObject; var Key: char);
begin
     if Key=#13 then begin checkbox2.Checked:=true; CheckBox2Click(Self);end;
end;

//создание формы
procedure TForm1.FormCreate(Sender: TObject);
var oldOS:string;
begin
     //проверка версии ОС
     {$ifdef linux}os:='linux';{$endif}
     {$ifdef windows}os:='windows';{$endif}
     path_program:=extractfilepath(paramstr(0));
     if os='windows' then path_backups:=path_program+'backup_database\' else path_backups:=path_program+'backup_database/';

     //считывание настроек
     IF(FileExists(path_program+'settings.ini'))then
     begin
          Inif:=TiniFile.Create(path_program+'settings.ini');
          oldOS:=IniF.ReadString('base','lastos','');
          if oldOS=os then begin
                                basename:=inif.ReadString('base','folder','');
                                autoupdate:=StrToBool(inif.ReadString('updates','checking',''));
                                //koef_heith:=StrToInt(inif.ReadString('base','koef_height',''));
                           end
          else
              begin
                    basename:=path_program + '1.sqlite';
                    inif.WriteBool('Base','parrentfolder',true);
                    inif.WriteString('base','folder',path_program+'1.sqlite');
                    inif.WriteString('base','lastOS',form1.os);
                    //inif.WriteString('base','koef_height','0');
                    showmessage('Внимание, первый запуск в новой ОС! Выбран путь к базе по умолчанию!');
              end;
          inif.Free;
     end
     else begin
               Inif:=TiniFile.Create(path_program+'settings.ini');
               inif.WriteBool('Base','parrentfolder',true);
               inif.WriteString('base','folder',path_program+'1.sqlite');
               inif.WriteString('base','lastOS',form1.os);
               inif.WriteBool('Updates','checking',false);
               //inif.WriteString('base','koef_height','0');
               inif.Free;
               basename:=path_program + '1.sqlite';
               ShowMessage('Файл налаштувань не знайдено, налаштування скинуті за замовчуванням');
          end;
     predohranitel:=0;
     save_reserv;
     //подключение к базе даных
     SQLite3Connection1.DatabaseName:=basename;
     SQLite3Connection1.Connected:=true;
     rem_connect;
     kasa_connect;
     state_count;
     finstat;
     ID_remont:=1;//по умолчанию присвоим значение идентификатору выбраной записи

     //если записей нет, то деактивация кнопки "удалить"
     if SQLQuery1.RecordCount=0 then Button2.Enabled:=false;
     DateTimePicker1.Date:=date;
     DateTimePicker2.Date:=date;
     DateTimePicker3.Date:=date;
     DateTimePicker4.Date:=date;
     DateTimePicker5.Date:=date;
     DateTimePicker6.Date:=date;
     DateTimePicker7.Date:=date;
     //задержка всплывающего номера телефона текущей позиции
     Application.HintHidePause:=100000;
     //Tabsheet1.Color:= TColor($00C08080);
     LabeledEdit12.NumbersOnly:=true;
     LabeledEdit11.NumbersOnly:=true;
     LabeledEdit13.NumbersOnly:=true;
     LabeledEdit9.NumbersOnly:=true;
end;
//активация кнопки "добавить" при открытии программы
procedure TForm1.FormShow(Sender: TObject);
begin
     size_columns;
     size_columns2;
end;

//Отчет "Оплачено"
procedure TForm1.MenuItem10Click(Sender: TObject);
begin
     SQLQuery2.Active:=false;
     SQLQuery2.sql.Clear;
     SQLQuery2.SQL.Add('Select * from Ремонт where Оплачено=:sost');
     SQLQuery2.ParamByName('sost').AsBoolean:=true;
     SQLQuery2.SQL.Add(' and (Конец_ремонта>=:date3 and Конец_ремонта<=:date4) and Сумма>0');
     SQLQuery2.ParamByName('date3').AsDate:=form1.DateTimePicker3.Date;
     SQLQuery2.ParamByName('date4').AsDate:=form1.DateTimePicker4.Date;
     SQLQuery2.SQL.add(' ORDER BY Конец_ремонта, Квитанция');
     SQLQuery2.Active:=true;
     frReport1.LoadFromFile('report_month.lrf');
     frReport1.ShowReport;
end;
//Отчет "расходники"
procedure TForm1.MenuItem11Click(Sender: TObject);
begin
     SQLQuery2.Active:=false;
     SQLQuery2.sql.Clear;
     SQLQuery2.SQL.Add('Select * from Расходники where Наличие=:sost');
     SQLQuery2.ParamByName('sost').AsBoolean:=false;
     SQLQuery2.SQL.Add(' and (Дата_продажи>=:date3 and Дата_продажи<=:date4)');
     SQLQuery2.ParamByName('date3').AsDate:=form1.DateTimePicker3.Date;
     SQLQuery2.ParamByName('date4').AsDate:=form1.DateTimePicker4.Date+1; //хз почему нужно +1
     SQLQuery2.SQL.add(' ORDER BY Квитанция');
     SQLQuery2.Active:=true;
     frReport1.LoadFromFile('report_rashodnik.lrf');
     frReport1.ShowReport;
end;
//отчет "клиент"
procedure TForm1.MenuItem12Click(Sender: TObject);
begin
     form1.SQLQuery2.Active:=false;
     form1.SQLQuery2.sql.Clear;
     form1.SQLQuery2.SQL.Add('select * from Ремонт where ID='+inttostr(form1.ID_remont));
     form1.SQLQuery2.Active:=true;
     form1.frReport1.LoadFromFile('report_klient.lrf');
     form1.frReport1.ShowReport;
end;
//Контекстное меню "Состояние-Не выбрано"
procedure TForm1.MenuItem13Click(Sender: TObject);
begin
     SQLQuery1.Edit;
     sqlQuery1.FieldByName('Состояние').AsInteger:=0;

     sqlQuery1.UpdateRecord;
     Sqlquery1.Post;// записываем данные
     sqlquery1.ApplyUpdates;// отправляем изменения в базу
     SQLTransaction1.Commit;

     form1.FormCreate(Self);

     if form1.CheckBox2.Checked=true then find;
     finstat;

     SQLQuery1.RecNo:=rec_pos;
end;

//копирование квитанции по контексту, возврат
procedure TForm1.MenuItem15Click(Sender: TObject);
var phone, name1, tech, kvit: string;
  summa,dohod:Double;
begin
     phone:=SQLQuery1.FieldByName('Телефон').AsString;
     name1:=SQLQuery1.FieldByName('Имя_заказчика').AsString;
     tech:=sqlQuery1.FieldByName('Наименование_техники').AsString;
     kvit:=sqlQuery1.FieldByName('Квитанция').AsString;
     summa:=sqlQuery1.FieldByName('Сумма').AsFloat;
     dohod:=sqlQuery1.FieldByName('Доход').AsFloat;;

     with SQLQuery1 do
     begin
          Append;
          FieldByName('Квитанция').AsString:=inttostr(last_NUM+1);
          FieldByName('Начало_ремонта').AsDateTime:=date;
          FieldByName('Конец_ремонта').AsDateTime:=date;
          FieldByName('Телефон').AsString:=phone;
          FieldByName('Имя_заказчика').AsString:=name1;
          FieldByName('Оплачено').AsBoolean:=false;
          FieldByName('Перезвонить').AsBoolean:=false;
          FieldByName('Выполнено').AsString:='Принято в '+TimeToStr(Now);
          FieldByName('Состояние').AsInteger:=1;

          if ((Sender as TMenuItem).Caption='Ім''я+телефон+техніка')or((Sender as TMenuItem).Caption='Повернення') then
          FieldByName('Наименование_техники').AsString:=tech;

          if (Sender as TMenuItem).Caption='Повернення' then
          begin
               FieldByName('Примечание').AsString:='Повернення по '+kvit;
               FieldByName('Стоимость').AsFloat:=dohod*(-1);
               FieldByName('Сумма').AsFloat:=summa*(-1);
               FieldByName('Оплачено').AsBoolean:=true;
               SQLQuery2.Active:=false;
               SQLQuery2.SQL.Clear;
               SQLQuery2.SQL.Add('INSERT INTO Расходники (Приход,Поставщик,Накладная,Код_товара,Наименование_расходника,Курс,Цена_уе,Вход,Наличие) SELECT Приход,Поставщик,Накладная,Код_товара,Наименование_расходника,Курс,Цена_уе,Вход,:sost FROM Расходники WHERE Квитанция=:copy');
               SQLQuery2.ParamByName('copy').AsInteger:=ID_remont;
               SQLQuery2.ParamByName('sost').AsBoolean:=true;
               SQLQuery2.ExecSQL;
          end;

          UpdateRecord;
          Post;// записываем данные
          ApplyUpdates;// отправляем изменения в базу
     end;
     SQLTransaction1.Commit;

     form1.FormCreate(Self);

     if form1.CheckBox2.Checked=true then find;
     finstat;

     Button1.SetFocus;
end;

//Удаление через контекстное меню
procedure TForm1.MenuItem17Click(Sender: TObject);
begin
  Button2Click(Self);
end;
//Контекстное меню "Перезвонить"
procedure TForm1.MenuItem19Click(Sender: TObject);
begin
     SQLQuery1.Edit;
     sqlQuery1.FieldByName('Перезвонить').AsBoolean:=false;

     sqlQuery1.UpdateRecord;
     Sqlquery1.Post;// записываем данные
     sqlquery1.ApplyUpdates;// отправляем изменения в базу
     SQLTransaction1.Commit;

     form1.FormCreate(Self);

     if form1.CheckBox2.Checked=true then find;
     finstat;

     SQLQuery1.RecNo:=rec_pos;
end;
//Поиск квитанций по текущему номеру телефона
procedure TForm1.MenuItem20Click(Sender: TObject);
var s:string;
begin
     s:=SQLQuery1.FieldByName('Телефон').AsString;
     button4.OnClick(Self);
     edit3.Text:=s;
     CheckBox2.Checked:=true;
     CheckBox2.OnClick(Self);
end;
//Контекстное меню "Состояние-В очереди"
procedure TForm1.MenuItem22Click(Sender: TObject);
begin
     SQLQuery1.Edit;
     sqlQuery1.FieldByName('Состояние').AsInteger:=1;

     sqlQuery1.UpdateRecord;
     Sqlquery1.Post;// записываем данные
     sqlquery1.ApplyUpdates;// отправляем изменения в базу
     SQLTransaction1.Commit;

     form1.FormCreate(Self);

     if form1.CheckBox2.Checked=true then find;
     finstat;

     SQLQuery1.RecNo:=rec_pos;
end;

//Контекстное меню "Состояние-Не выбрано"
procedure TForm1.MenuItem24Click(Sender: TObject);
begin
     SQLQuery1.Edit;
     sqlQuery1.FieldByName('Состояние').AsInteger:=2;

     sqlQuery1.UpdateRecord;
     Sqlquery1.Post;// записываем данные
     sqlquery1.ApplyUpdates;// отправляем изменения в базу
     SQLTransaction1.Commit;

     form1.FormCreate(Self);

     if form1.CheckBox2.Checked=true then find;
     finstat;

     SQLQuery1.RecNo:=rec_pos;
end;

//Контекстное меню "Состояние-Не выбрано"
procedure TForm1.MenuItem25Click(Sender: TObject);
begin
     SQLQuery1.Edit;
     sqlQuery1.FieldByName('Состояние').AsInteger:=3;

     sqlQuery1.UpdateRecord;
     Sqlquery1.Post;// записываем данные
     sqlquery1.ApplyUpdates;// отправляем изменения в базу
     SQLTransaction1.Commit;

     form1.FormCreate(Self);

     if form1.CheckBox2.Checked=true then find;
     finstat;

     SQLQuery1.RecNo:=rec_pos;
end;

//Контекстное меню "Состояние-Не выбрано"
procedure TForm1.MenuItem27Click(Sender: TObject);
begin
     SQLQuery1.Edit;
     sqlQuery1.FieldByName('Состояние').AsInteger:=5;

     sqlQuery1.UpdateRecord;
     Sqlquery1.Post;// записываем данные
     sqlquery1.ApplyUpdates;// отправляем изменения в базу
     SQLTransaction1.Commit;

     form1.FormCreate(Self);

     if form1.CheckBox2.Checked=true then find;
     finstat;

     SQLQuery1.RecNo:=rec_pos;
end;

//Контекстное меню "Состояние-Одесса"
procedure TForm1.MenuItem28Click(Sender: TObject);
begin
     SQLQuery1.Edit;
     sqlQuery1.FieldByName('Состояние').AsInteger:=7;

     sqlQuery1.UpdateRecord;
     Sqlquery1.Post;// записываем данные
     sqlquery1.ApplyUpdates;// отправляем изменения в базу
     SQLTransaction1.Commit;

     form1.FormCreate(Self);

     if form1.CheckBox2.Checked=true then find;
     finstat;

     SQLQuery1.RecNo:=rec_pos;
end;

procedure TForm1.MenuItem29Click(Sender: TObject);
begin
     SQLQuery4.Active:=false;
     SQLQuery4.sql.Clear;
     SQLQuery4.SQL.Add('Select Конец_ремонта, Квитанция, Сумма, Примечание from Ремонт where Оплачено=:sost');
     SQLQuery4.ParamByName('sost').AsBoolean:=true;
     SQLQuery4.SQL.Add(' and (Конец_ремонта>=:date3 and Конец_ремонта<=:date4) and Сумма>0');
     SQLQuery4.ParamByName('date3').AsDate:=form1.DateTimePicker3.Date;
     SQLQuery4.ParamByName('date4').AsDate:=form1.DateTimePicker4.Date;
     SQLQuery4.SQL.add(' ORDER BY Конец_ремонта, Примечание, Квитанция');
     SQLQuery4.Active:=true;

     CSVExporter1.Execute;
     ShowMessage('Файл "1.csv" готовий');
     if os='linux' then begin
                             ExecuteProcess('/usr/bin/libreoffice','1.csv')
                             end else ExecuteProcess('libreoffice','1.csv');
end;

//Контекстное меню "Состояние-Не выбрано"
procedure TForm1.MenuItem26Click(Sender: TObject);
begin
     SQLQuery1.Edit;
     sqlQuery1.FieldByName('Состояние').AsInteger:=4;

     sqlQuery1.UpdateRecord;
     Sqlquery1.Post;// записываем данные
     sqlquery1.ApplyUpdates;// отправляем изменения в базу
     SQLTransaction1.Commit;

     form1.FormCreate(Self);

     if form1.CheckBox2.Checked=true then find;
     finstat;

     SQLQuery1.RecNo:=rec_pos;
end;

//открытие склада
procedure TForm1.MenuItem2Click(Sender: TObject);
begin
     form1.Visible:=false;
     form6.ShowModal;
end;

procedure TForm1.MenuItem3Click(Sender: TObject);
begin

end;

procedure TForm1.MenuItem4Click(Sender: TObject);
begin

end;

//распаковка резервной копии БД
procedure TForm1.MenuItem5Click(Sender: TObject);
Var
  ArchStream: TMemoryStream;
  FileStream: TMemoryStream;
  ZReadArc: TZlibReadArchive;
  X: Integer;
  DestPath: String;
begin
  OpenDialog1.Execute;
  if OpenDialog1.FileName<>'' then
      begin
           ArchStream := TMemoryStream.Create;
           FileStream := TmemoryStream.Create;

           ArchStream.LoadFromFile(OpenDialog1.FileName);

           ZReadArc:= TZlibReadArchive.Create(ArchStream);
           DestPath := 'backup_database';
           for X := 0 to ZReadArc.Count -1 do
           begin
           ZReadArc.ExtractFileToStream(X, FileStream);
           FileStream.SaveToFile(DestPath+ZReadArc.FilesInArchive[X].FilePath+'/'+ZReadArc.FilesInArchive[X].FIleName);
           FileStream.Position := 0;
           FileStream.Size := 0;
           end;
           ZReadArc.Free;
           ArchStream.Free;
           FileStream.Free;
           ShowMessage('Розпакування завершене!');
      end;
end;

procedure TForm1.MenuItem6Click(Sender: TObject);
begin
     form3.ShowModal;
end;

//Контекстное меню "Оплачено"
procedure TForm1.MenuItem9Click(Sender: TObject);
begin
          SQLQuery1.Edit;
          sqlQuery1.FieldByName('Оплачено').AsBoolean:=true;
          sqlQuery1.FieldByName('Конец_ремонта').AsDateTime:=Date;
          SQLQuery1.FieldByName('Состояние').AsInteger:=6;

          sqlQuery1.UpdateRecord;
          Sqlquery1.Post;// записываем данные
          sqlquery1.ApplyUpdates;// отправляем изменения в базу

          form2.SQLQuery4.Active:=false;
          form2.SQLQuery4.SQL.Clear;
          form2.SQLQuery4.SQL.Add('Update Расходники set №_квитанции=:numWORK where Квитанция='+inttostr(form1.ID_remont));
          form2.SQLQuery4.ParamByName('numWORK').Value:=sqlQuery1.FieldByName('Квитанция').AsString;
          form2.SQLQuery4.ExecSQL;

          form2.SQLQuery4.Active:=false;
          form2.SQLQuery4.SQL.Clear;
          form2.SQLQuery4.SQL.Add('Update Расходники set Дата_продажи=:date where Квитанция='+inttostr(form1.ID_remont));
          form2.SQLQuery4.ParamByName('date').Value:=Date;
          form2.SQLQuery4.ExecSQL;

          SQLTransaction1.Commit;

          form1.SQLQuery1.Active:=false;
          form1.SQLQuery1.Active:=true;
          form1.FormCreate(Self);

          if form1.CheckBox2.Checked=true then find else rem_connect;
          finstat;

          Button1.SetFocus;
          SQLQuery1.RecNo:=rec_pos;
end;

//убрать подсветку даты при фильтре "все"
procedure TForm1.RadioButton1Click(Sender: TObject);
begin
  if RadioButton1.Checked=true then begin groupbox4.Color:=clSkyBlue;groupbox6.color:=clSkyBlue;end;
end;
//подсветка дат "оплачено"
procedure TForm1.RadioButton2Click(Sender: TObject);
begin
  if RadioButton2.Checked=true then begin groupbox4.color:=clSkyBlue;groupbox6.color:=clRed;end;
end;
//подсветка дат "Неоплачено"
procedure TForm1.RadioButton3Click(Sender: TObject);
begin
  if RadioButton3.Checked=true then begin groupbox4.color:=clRed;groupbox6.color:=clSkyBlue;end;
end;

procedure TForm1.Timer1Timer(Sender: TObject);
begin
     form1.Caption:='Сервіс центр "ЧіпЗона" v. 4.0.6          '+ TimeToStr(Time);
     form2.Caption:='Виконання роботи          '+ TimeToStr(Time);
     form6.Caption:='Склад          '+ TimeToStr(Time);
end;

end.

