unit zakaz;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, sqldb, db, FileUtil, DateTimePicker, Forms, Controls,
  Graphics, Dialogs, ExtCtrls, StdCtrls, DBGrids, DbCtrls, Grids, Buttons,
  MaskEdit;

type

  { TForm2 }

  TForm2 = class(TForm)
    Button1: TBitBtn;
    Button2: TBitBtn;
    Button3: TBitBtn;
    Button4: TBitBtn;
    Button5: TBitBtn;
    CheckBox1: TCheckBox;
    CheckBox2: TCheckBox;
    CheckBox3: TCheckBox;
    CheckBox4: TCheckBox;
    ComboBox1: TComboBox;
    ComboBox2: TComboBox;
    DataSource1: TDataSource;
    DataSource2: TDataSource;
    DateTimePicker1: TDateTimePicker;
    DateTimePicker2: TDateTimePicker;
    DBGrid1: TDBGrid;
    DBLookupComboBox1: TDBLookupComboBox;
    Edit1: TEdit;
    Edit10: TEdit;
    Edit11: TEdit;
    Edit12: TEdit;
    Edit13: TEdit;
    Edit2: TEdit;
    Edit3: TMaskEdit;
    Edit4: TEdit;
    Edit5: TEdit;
    Edit6: TEdit;
    Edit7: TEdit;
    Edit8: TEdit;
    Edit9: TEdit;
    GroupBox1: TGroupBox;
    GroupBox2: TGroupBox;
    GroupBox3: TGroupBox;
    Label1: TLabel;
    Label10: TLabel;
    Label11: TLabel;
    Label12: TLabel;
    Label13: TLabel;
    Label14: TLabel;
    Label15: TLabel;
    Label16: TLabel;
    Label17: TLabel;
    Label18: TLabel;
    Label19: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    Label4: TLabel;
    Label5: TLabel;
    Label6: TLabel;
    Label7: TLabel;
    Label8: TLabel;
    Label9: TLabel;
    Memo1: TMemo;
    Memo2: TMemo;
    Memo3: TMemo;
    Memo4: TMemo;
    Panel1: TPanel;
    SQLQuery1: TSQLQuery;
    SQLQuery2: TSQLQuery;
    SQLQuery3: TSQLQuery;
    SQLQuery4: TSQLQuery;
    procedure Button1Click(Sender: TObject);
    procedure Button2Click(Sender: TObject);
    procedure Button3Click(Sender: TObject);
    procedure Button4Click(Sender: TObject);
    procedure Button5Click(Sender: TObject);
    procedure CheckBox2Click(Sender: TObject);
    procedure CheckBox3Change(Sender: TObject);
    procedure ComboBox1Change(Sender: TObject);
    procedure DBGrid1PrepareCanvas(sender: TObject);
    procedure DBLookupComboBox1Change(Sender: TObject);
    procedure Edit1Change(Sender: TObject);
    procedure Edit1KeyPress(Sender: TObject; var Key: char);
    procedure Edit1KeyUp(Sender: TObject);
    procedure Edit4KeyUp(Sender: TObject);
    procedure Edit6KeyPress(Sender: TObject; var Key: char);
    procedure Edit6KeyUp(Sender: TObject);
    procedure Edit7KeyPress(Sender: TObject; var Key: char);
    procedure Edit7KeyUp(Sender: TObject);
    procedure FormClose(Sender: TObject);
    procedure FormCreate(Sender: TObject);
    procedure FormShow(Sender: TObject);
  private

  public

  end;

var
  triger: Boolean;
  Form2: TForm2;
  procedure size_columns_rashodniki;
  procedure reconnect_rashodniki;
  procedure rasschet;

implementation

{$R *.lfm}
uses Main;

//размер столбцов таблицы
procedure size_columns_rashodniki;
var podrobno:integer;
begin
      form2.DBGrid1.Columns[0].Width:=90;
      form2.DBGrid1.Columns[1].Width:=0;
      form2.DBGrid1.Columns[2].Width:=0;
      form2.DBGrid1.Columns[3].Width:=75;
      form2.DBGrid1.Columns[5].Width:=65;
      if form2.checkbox3.Checked=true then
      begin
           podrobno:=0;
           form2.label17.Visible:=true;
           form2.Edit10.Visible:=true;
      end  else
      begin
           podrobno:=form2.DBGrid1.Columns[5].Width;
           form2.label17.Visible:=false;
           form2.Edit10.Visible:=false;
      end;
//      form2.DBGrid1.Columns[7].DisplayFormat:='0.00';
      form2.DBGrid1.Columns[4].Width:=form2.Width-450+podrobno;
      form2.DBGrid1.Columns[6].Width:=65-podrobno;
      form2.DBGrid1.Columns[7].Width:=0;
      form2.DBGrid1.Columns[8].Width:=0;
      form2.DBGrid1.Columns[9].Width:=0;
      form2.DBGrid1.Columns[10].Width:=0;

end;

procedure reconnect_rashodniki;//Вывод списка расходников, которые на квитанции
begin
      form2.SQLQuery1.Active:=false;
      form2.SQLQuery1.SQL.Clear;
      form2.SQLQuery1.SQL.add('select Приход, ID, Квитанция, Поставщик, Наименование_расходника, Цена_грн, Вход, Сумма, Доход, Наличие, №_квитанции, Дата_продажи from Расходники where Квитанция=:id');
      form2.SQLQuery1.ParamByName('id').AsInteger:=form1.ID_remont;
      form2.SQLQuery1.Active:=true;
      form2.ComboBox1.Items[0];
      if form2.SQLQuery1.RecordCount=0 then
      begin
           form2.button3.Enabled:=false;
           form2.DBGrid1.Visible:=false;
      end
           else
      begin
           form2.button3.Enabled:=true;
           form2.DBGrid1.Visible:=true;
      end;
      size_columns_rashodniki;
end;

procedure rasschet;
begin
      if form2.edit4.Text='' then form2.edit4.Text:='0';
      form2.edit8.Text:=form2.edit4.Text;
      if form2.edit4.Text='' then form2.edit11.Text:=form2.edit9.Text
      else form2.edit11.Text:=floattostr(strtofloat(form2.edit8.Text)+strtofloat(form2.edit9.Text));
      form2.Button1.Enabled:=true;
end;

{ TForm2 }

//заполнение полей из базы
procedure TForm2.FormShow(Sender: TObject);
begin
      //скрытие главной формы
      form1.Visible:=false;

      reconnect_rashodniki;

      //деактивация доступа к складу если выбрана "ЧипЗона", так как она вбивается руками
      if (ComboBox1.Items[ComboBox1.ItemIndex]='ЧипЗона')then DBLookupComboBox1.Visible:=false;

      SQLQuery2.Active:=false;
      SQLQuery2.SQL.Clear;
      SQLQuery2.SQL.add('select * from Ремонт where ID='+inttostr(form1.ID_remont));
      SQLQuery2.Active:=true;

      edit1.Text:=SQLQuery2.FieldByName('Квитанция').AsString;
      edit2.Text:=SQLQuery2.FieldByName('Имя_заказчика').AsString;
      edit3.Text:=SQLQuery2.FieldByName('Телефон').AsString;

      Memo1.Text:=SQLQuery2.FieldByName('Наименование_техники').AsString;
      Memo2.Text:=SQLQuery2.FieldByName('Примечание').AsString;
      Memo3.Text:=SQLQuery2.FieldByName('Описание_неисправности').AsString;
      Memo4.Text:=SQLQuery2.FieldByName('Выполнено').AsString;
      edit4.Text:=SQLQuery2.FieldByName('Стоимость').AsString;

      DateTimePicker1.Date:=SQLQuery2.FieldByName('Начало_ремонта').AsDateTime;
      DateTimePicker2.Date:=SQLQuery2.FieldByName('Конец_ремонта').AsDateTime;
      CheckBox2.Checked:=SQLQuery2.FieldByName('Оплачено').AsBoolean;
      CheckBox1.Checked:=SQLQuery2.FieldByName('Перезвонить').AsBoolean;
      ComboBox2.ItemIndex:=SQLQuery2.FieldByName('Состояние').AsInteger;
      Button4.Enabled:=false;//добавить расходник
      Button1.Enabled:=false;//сохранить
      // подсчет суммы расходников
      sqlQuery3.Active:=false;
      sqlQuery3.SQL.Clear;
      sqlQuery3.SQL.Add('Select sum(Сумма),sum(Доход) from Расходники where Квитанция='+inttostr(form1.ID_remont));
      sqlQuery3.Active:=true;
//      sqlQuery3.ExecSQL;
      Edit8.Text:=Edit4.Text;
      if sqlQuery3.Fields[0].Value<>null then
      begin
            Edit9.Text:=floattostr(sqlQuery3.Fields[0].Value);
            Edit10.Text:=floattostr(sqlQuery3.Fields[1].Value);
      end
      else
      begin
            Edit9.Text:='0';
            Edit10.Text:='0';
      end;
      edit11.text:=floattostr(strtofloat(edit8.text)+strtofloat(edit9.text));
      inc(form1.predohranitel);

      ComboBox1Change(Self);
      Memo4.SetFocus;
      if checkbox2.Checked=true then triger:=true;
end;

//выбор контрагента
procedure TForm2.ComboBox1Change(Sender: TObject);
begin
     edit7.text:='0';
     edit5.clear;
     if (ComboBox1.Items[ComboBox1.ItemIndex]<>'ЧипЗона') and (ComboBox1.Items[ComboBox1.ItemIndex]<>'Послуга')
     then
                begin
                      sqlQuery4.Active:=false;
                      sqlQuery4.SQL.Clear;
                      sqlQuery4.SQL.Add('select * from Расходники where Поставщик='''+ComboBox1.Items[ComboBox1.ItemIndex]+''''+' and Наличие=:s GROUP BY Наименование_расходника ORDER BY Приход');
                      SQLQuery4.ParamByName('s').AsBoolean:=true;
                      sqlQuery4.Active:=true;
                      DBLookupComboBox1.Visible:=true;
                      edit5.Visible:=false;
                      edit13.Visible:=true;
                      label19.Visible:=true;
                end
      else begin DBLookupComboBox1.Visible:=false;edit5.Visible:=true;edit13.Visible:=false;label19.Visible:=false;end;
end;
//заливка таблицы
procedure TForm2.DBGrid1PrepareCanvas(sender: TObject);
begin
  //Полосатая заливка
      if odd(TDBGrid(Sender).DataSource.Dataset.RecNo) then TDBGrid(Sender).Canvas.Brush.Color :=RGBToColor(237,234,234);
end;

//Заполнение полей при выборе нужной позиции со склада
procedure TForm2.DBLookupComboBox1Change(Sender: TObject);
begin
       SQLQuery4.RecNo:=DBLookupComboBox1.ItemIndex+1;
       edit7.Text:=SQLQuery4.FieldByName('Вход').Value;    // Edit11:TEdit
       edit5.Text:=SQLQuery4.FieldByName('Наименование_расходника').Value;
       edit13.Text:=SQLQuery4.FieldByName('Приход').Value;
end;

//активация кнопки "сохранить"
procedure TForm2.Edit1Change(Sender: TObject);
begin
      button1.Enabled:=true;;
end;
//фильтрация ввода только цифр
procedure TForm2.Edit1KeyPress(Sender: TObject; var Key: char);
begin
  if not (Key in ['0'..'9', #8,#13,',','.'])then Key:=#0;
end;

//проверка номера квитанции на "0"
procedure TForm2.Edit1KeyUp(Sender: TObject);
begin
     if edit1.Text='' then edit1.text:='0';
end;

//изменение суммы ремонта
procedure TForm2.Edit4KeyUp(Sender: TObject);
begin
      if form2.edit6.Text='' then form2.edit6.Text:='0';
      rasschet;
end;
//фильтрация ввода
procedure TForm2.Edit6KeyPress(Sender: TObject; var Key: char);
begin
      if key='.' then key:=',';
      if not (Key in ['0'..'9', #8,#13,',','.'])then Key:=#0; {Фильтр ввода - только числа}
      if key=#13 then edit7.Text:=edit6.Text;
end;
//активация кнопки "добавть расходник" если цена выше или равна входу
procedure TForm2.Edit6KeyUp(Sender: TObject);
begin
      if form2.edit6.Text='' then form2.edit6.Text:='0';
      if strtofloat(edit6.text)>=strtofloat(edit7.text) then button4.Enabled:=true else button4.Enabled:=false;
end;
//фильтрация ввода
procedure TForm2.Edit7KeyPress(Sender: TObject; var Key: char);
begin
     if key='.' then key:=',';
     if not (Key in ['0'..'9', #8,#13,',','.'])then Key:=#0;
end;
//проверка на "0"
procedure TForm2.Edit7KeyUp(Sender: TObject);
begin
     if form2.edit7.Text='' then form2.edit7.Text:='0';
end;

//закрытие формы
procedure TForm2.FormClose(Sender: TObject);
begin
     triger:=false;
      edit1.Text:='0';
      edit5.Clear;
      DBLookupComboBox1.KeyValue := NULL;

      form1.predohranitel:=0; //эта хреновина блокирует нежелательные срабатывания функции "оплачено", портировано из Delphi, возможно тут и не нужно...
      form1.Visible:=true;

      //возврат списка в состояние, которое было до редактирования (с фильтром или без)
      if (form1.CheckBox2.Checked=true) then find else
        begin form1.CheckBox2.Checked:=false;rem_connect;end;

      form1.Button1.SetFocus;

      if form1.SQLQuery1.RecordCount<form1.rec_pos then dec(form1.rec_pos);
      if form1.SQLQuery1.RecordCount>1 then form1.SQLQuery1.RecNo:=form1.rec_pos;
end;

procedure TForm2.FormCreate(Sender: TObject);
begin
     //SetBounds(0, NewTop, Width, NewHeight-koef_heith);
end;

//кнопка "закрыть"
procedure TForm2.Button2Click(Sender: TObject);
begin
      form2.Close;
end;
//удаление расходника
procedure TForm2.Button3Click(Sender: TObject);
var id:integer;
begin
      if MessageDlg('Видалення товару', 'Видалити запис?', mtConfirmation, [mbYes, mbNo],0) = mrYes then
                Begin
                     id:=SQLQuery1.FieldByName('ID').AsInteger;
                     if (SQLQuery1.FieldByName('Поставщик').AsString='ЧипЗона') or (SQLQuery1.FieldByName('Поставщик').AsString='Послуга') then
                     begin
                          SQLQuery1.Delete;
                          sqlquery1.ApplyUpdates;// отправляем изменения в базу
                          form1.SQLTransaction1.Commit;//без этого не работает
                     end
                     else
                     begin
                          SQLQuery1.Active:=false;
                          SQLQuery1.SQL.Clear;
                          SQLQuery1.SQL.Add('Update Расходники set №_квитанции=0, Наличие=:sost, Квитанция=0 where ID=:delete');
                          SQLQuery1.ParamByName('delete').AsInteger:=id;
                          SQLQuery1.ParamByName('sost').AsBoolean:=true;
                          SQLQuery1.ExecSQL;
                     end;
                     reconnect_rashodniki;//Вывод списка расходников, которые на квитанции

                     //автопересчет суммы расходников и дохода от них
                     sqlQuery3.Active:=false;
                     sqlQuery3.SQL.Clear;
                     sqlQuery3.SQL.Add('Select sum(Сумма), sum(Доход) from Расходники where Квитанция='+inttostr(form1.ID_remont));
                     sqlQuery3.Active:=true;

                     if sqlQuery3.Fields[0].Value<>NULL then edit9.Text:=sqlQuery3.Fields[0].Value else edit9.Text:='0';
                     if sqlQuery3.Fields[1].Value<>NULL then edit10.Text:=sqlQuery3.Fields[1].Value else edit10.Text:='0';

                     edit11.Text:=floattostr(strtofloat(edit8.Text)+strtofloat(edit9.Text));
                     button1.Enabled:=true;
                     button2.Enabled:=false;

                     ComboBox1Change(Self);
                end;
end;

//Добавить расходник
procedure TForm2.Button4Click(Sender: TObject);
begin
     if (ComboBox1.Items[ComboBox1.ItemIndex]='ЧипЗона')or(ComboBox1.Items[ComboBox1.ItemIndex]='Послуга')then
                    begin
                          SQLQuery1.Append;
                          SQLQuery1.edit;

                          //Проверка на оплаченность квитанции
                          if CheckBox2.Checked=true then
                          SQLQuery1.FieldByName('Дата_продажи').AsDateTime:=DateTimePicker2.Date;

                          SQLQuery1.FieldByName('Поставщик').AsString:=ComboBox1.Items[ComboBox1.ItemIndex];
                          SQLQuery1.FieldByName('Наименование_расходника').AsString:=edit5.Text;
                          SQLQuery1.FieldByName('Цена_грн').Asfloat:=strtofloat(edit6.Text);
                          SQLQuery1.FieldByName('Вход').Asfloat:=strtofloat(edit7.Text);
                          SQLQuery1.FieldByName('Сумма').AsFloat:=strtofloat(edit6.text);
                          SQLQuery1.FieldByName('Доход').AsFloat:=(StrToFloat(edit6.Text)-StrToFloat(edit7.Text));
                          SQLQuery1.FieldByName('Квитанция').AsInteger:=form1.ID_remont;
                          SQLQuery1.FieldByName('Наличие').AsBoolean:=false;
                          SQLQuery1.FieldByName('№_квитанции').AsString:=edit1.Text;

                          Sqlquery1.Post;// записываем данные
                          sqlquery1.ApplyUpdates;// отправляем изменения в базу
                          form1.SQLTransaction1.Commit;
                    end
                    else
                    begin
                          SQLQuery4.Edit;
                          SQLQuery4.FieldByName('Доход').AsFloat:=StrToFloat(edit6.Text)-StrToFloat(edit7.Text);
                          SQLQuery4.FieldByName('Сумма').AsFloat:=strtofloat(edit6.text);
                          SQLQuery4.FieldByName('Цена_грн').AsFloat:=strtofloat(edit6.text);
                          SQLQuery4.FieldByName('Квитанция').AsInteger:=form1.ID_remont;
                          SQLQuery4.FieldByName('Наличие').AsBoolean:=false;
                          SQLQuery4.FieldByName('№_квитанции').AsString:=edit1.Text;
                          //Проверка на оплаченность квитанций
                          if CheckBox2.Checked=true then
                          SQLQuery4.FieldByName('Дата_продажи').AsDateTime:=DateTimePicker2.Date;

                          //sqlQuery4.UpdateRecord;
                          Sqlquery4.Post;// записываем данные
                          sqlquery4.ApplyUpdates;// отправляем изменения в базу
                          form1.SQLTransaction1.Commit;

                          //обновление базы расходников "в наличии" на складе
                          sqlQuery4.Active:=false;
                          sqlQuery4.SQL.Clear;
                          sqlQuery4.SQL.Add('select * from Расходники where Поставщик='''+ComboBox1.Items[ComboBox1.ItemIndex]+''''+' and Наличие=:s GROUP BY Наименование_расходника ORDER BY Приход');
                          SQLQuery4.ParamByName('s').AsBoolean:=true;
                          sqlQuery4.Active:=true;
                          DBLookupComboBox1.Text:='';
                    end;
    reconnect_rashodniki;//Вывод списка расходников, которые на квитанции
    ComboBox1Change(Self);
    edit5.Clear;//поле "наименование расходника"
    edit6.Text:='0';//цена
    edit7.Text:='0';//вход
    edit13.Text:='0';//Дата прихода
    button4.Enabled:=false;//кнопка "добавить расходник"
    Button1.Enabled:=true;//кнопка "сохранить"
    Button2.Enabled:=False;//кнопка "Закрыть"
    Button3.Enabled:=true;//кнопка "Удалить расходник"

    //автопересчет суммы расходников и дохода от них
    sqlQuery3.Active:=false;
    sqlQuery3.SQL.Clear;
    sqlQuery3.SQL.Add('Select sum(Сумма), sum(Доход) from Расходники where Квитанция='+inttostr(form1.ID_remont));
    sqlQuery3.Active:=true;

    edit9.Text:=sqlQuery3.Fields[0].Value;
    edit10.Text:=sqlQuery3.Fields[1].Value;

    edit11.Text:=floattostr(strtofloat(edit8.Text)+strtofloat(edit9.Text));
end;

procedure TForm2.Button5Click(Sender: TObject);
begin
  form1.MenuItem12Click(Self);
end;

//Оплачено
procedure TForm2.CheckBox2Click(Sender: TObject);
begin

      inc(form1.predohranitel);
      Button1.Enabled:=true;
      if form1.predohranitel>1 then
      if checkbox2.Checked=true then
      begin
           if MessageDlg('Дата сплати','Дата сплати сьогодні?', mtConfirmation, [mbYes, mbNo], 0) = mrYes
           then DateTimePicker2.Date:=date;

           SQLQuery4.Active:=false;
           SQLQuery4.SQL.Clear;
           SQLQuery4.SQL.Add('Update Расходники set №_квитанции=:numWORK, Дата_продажи=:date where Квитанция='+inttostr(form1.ID_remont));
           SQLQuery4.ParamByName('numWORK').Value:=edit1.Text;
           SQLQuery4.ParamByName('date').Value:=DateTimePicker2.DateTime;
           SQLQuery4.ExecSQL;

      end;
end;

procedure TForm2.CheckBox3Change(Sender: TObject);
begin
     size_columns_rashodniki;
end;

//сохранить
procedure TForm2.Button1Click(Sender: TObject);
var s:string;
begin
      rasschet;
      if CheckBox4.Checked=true then
                    begin
                        s:=memo2.Text;
                        memo2.Clear;
                        memo2.Text:='Картка. '+s;
                    end;
      with SQLQuery2 do
      begin
          Active:=false;
          Active:=true;
          Edit;
          FieldByName('Квитанция').AsString:=edit1.text;
          FieldByName('Начало_ремонта').AsDateTime:=DateTimePicker1.Date;
          FieldByName('Конец_ремонта').AsDateTime:=DateTimePicker2.Date;
          FieldByName('Имя_заказчика').Asstring:=edit2.text;
          FieldByName('Телефон').Asstring:=edit3.text;
          FieldByName('Наименование_техники').Asstring:=memo1.Text;
          FieldByName('Описание_неисправности').AsString:=memo3.Text;
          FieldByName('Выполнено').Asstring:=memo4.Text;
          FieldByName('Стоимость').Asfloat:=StrToInt(edit8.Text);
          FieldByName('Сумма').Asfloat:=StrToInt(edit8.Text)+StrToInt(edit9.Text);
          FieldByName('Оплачено').AsBoolean:=CheckBox2.Checked;
          FieldByName('Перезвонить').AsBoolean:=CheckBox1.Checked;
          FieldByName('Примечание').Asstring:=memo2.Text;
          FieldByName('Доход').AsFloat:=strtofloat(edit10.Text);
          if CheckBox2.Checked=true then ComboBox2.ItemIndex:=6;
          FieldByName('Состояние').AsInteger:=ComboBox2.ItemIndex;

          UpdateRecord;
          Post;// записываем данные
          ApplyUpdates;// отправляем изменения в базу
      end;

      form1.SQLTransaction1.Commit;

      button1.Enabled:=false;//кнопка "сохранить"
      Button2.Enabled:=true;//кнопка "закрыть"

      form1.SQLQuery1.Active:=false;
      form1.SQLQuery1.Active:=true;
      form1.SQLQuery5.Active:=false;
      form1.SQLQuery5.Active:=true;
      reconnect_rashodniki;
      state_count;

      finstat;
      ////////внесення запусу до каси
      if StrToFloat(edit11.Text)<>0 then
      if (CheckBox2.Checked=true) and (triger=false) then
           begin

               form1.ComboBox2.ItemIndex:=0;
               if CheckBox4.Checked=true then form1.CheckBox4.Checked:=true;
               CheckBox4.Checked:=false;
               form1.DateTimePicker7.Date:=DateTimePicker2.Date;
               form1.LabeledEdit9.Text:=edit11.Text;
               form1.LabeledEdit10.Text:='Квитанція '+edit1.text+'. ';
               form1.BitBtn1Click(Self);
               form1.CheckBox4.Checked:=false;
           end;

           /////
end;

end.

