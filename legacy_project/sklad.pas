unit sklad;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, db, sqldb, FileUtil, DateTimePicker, Forms, Controls,
  Graphics, Dialogs, StdCtrls, ComCtrls, MaskEdit, Spin, DBGrids, Grids,
  ExtCtrls, Buttons, Clipbrd;

type

  { TForm6 }

  TForm6 = class(TForm)
    Button1: TBitBtn;
    Button2: TBitBtn;
    Button3: TBitBtn;
    Button4: TBitBtn;
    Button5: TBitBtn;
    CheckBox1: TToggleBox;
    CheckBox2: TCheckBox;
    CheckBox3: TCheckBox;
    ComboBox1: TComboBox;
    ComboBox2: TComboBox;
    DataSource1: TDataSource;
    DateTimePicker1: TDateTimePicker;
    DateTimePicker2: TDateTimePicker;
    DateTimePicker3: TDateTimePicker;
    DateTimePicker4: TDateTimePicker;
    DateTimePicker5: TDateTimePicker;
    DBGrid1: TDBGrid;
    Edit1: TEdit;
    Edit2: TEdit;
    Edit3: TEdit;
    Edit4: TEdit;
    Edit5: TEdit;
    Edit6: TEdit;
    GroupBox1: TGroupBox;
    GroupBox2: TGroupBox;
    GroupBox3: TGroupBox;
    GroupBox4: TGroupBox;
    GroupBox5: TGroupBox;
    Label1: TLabel;
    Label10: TLabel;
    Label11: TLabel;
    Label12: TLabel;
    Label13: TLabel;
    Label14: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    Label4: TLabel;
    Label5: TLabel;
    Label6: TLabel;
    Label7: TLabel;
    Label8: TLabel;
    Label9: TLabel;
    RadioButton1: TRadioButton;
    RadioButton2: TRadioButton;
    RadioButton3: TRadioButton;
    RadioGroup1: TRadioGroup;
    SpinEdit1: TSpinEdit;
    SQLQuery1: TSQLQuery;
    procedure Button1Click(Sender: TObject);
    procedure Button2Click(Sender: TObject);
    procedure Button3Click(Sender: TObject);
    procedure Button4Click(Sender: TObject);
    procedure Button5Click(Sender: TObject);
    procedure CheckBox1Click(Sender: TObject);
    procedure CheckBox2Click(Sender: TObject);
    procedure CheckBox3Click(Sender: TObject);
    procedure ComboBox1Change(Sender: TObject);
    procedure DBGrid1PrepareCanvas(sender: TObject; DataCol: Integer;
      Column: TColumn; AState: TGridDrawState);
    procedure Edit4KeyPress(Sender: TObject; var Key: char);
    procedure Edit4KeyUp(Sender: TObject; var Key: Word; Shift: TShiftState);
    procedure Edit5KeyPress(Sender: TObject; var Key: char);
    procedure FormClose(Sender: TObject; var CloseAction: TCloseAction);
    procedure FormCreate(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure RadioButton1Click(Sender: TObject);
    procedure RadioButton2Click(Sender: TObject);
    procedure RadioButton3Click(Sender: TObject);
  private

  public

  end;

var
  Form6: TForm6;

implementation

{$R *.lfm}
 uses Main;
{ TForm6 }
procedure sklad_connect;
begin
      form6.SQLQuery1.Active := False;
      form6.SQLQuery1.SQL.Clear;
      form6.SQLQuery1.SQL.Add('SELECT ID, Приход, Поставщик, Накладная, Код_товара, Наименование_расходника, Цена_уе, Курс, Вход, Наличие, Дата_продажи, №_квитанции');
      form6.SQLQuery1.SQL.Add('FROM Расходники');
      form6.SQLQuery1.SQL.Add('WHERE Наличие = :sost');
      if form6.CheckBox3.Checked = True then form6.SQLQuery1.SQL.Add('GROUP BY Наименование_расходника');
      form6.SQLQuery1.SQL.Add('ORDER BY Приход DESC');
      form6.SQLQuery1.ParamByName('sost').AsBoolean := True;
      form6.SQLQuery1.Active := True;

      if form6.SQLQuery1.RecordCount=0 then form6.button3.Enabled:=false else form6.button3.Enabled:=true;
end;
procedure size_columns;
begin
      form6.DBGrid1.Columns[0].Width:=0;//Код
      form6.DBGrid1.Columns[1].Width:=70;//Приход
      form6.DBGrid1.Columns[2].Width:=55;//Поставщик
      form6.DBGrid1.Columns[2].Title.Caption := 'Постач.';
      form6.DBGrid1.Columns[3].Width:=105;//Накладная
      form6.DBGrid1.Columns[3].Title.Caption := 'Накладна';
      form6.DBGrid1.Columns[4].Width:=75;//Код_товара
      form6.DBGrid1.Columns[4].Title.Caption := 'Код товару';
      form6.DBGrid1.Columns[5].Width:=form1.DBGrid1.Width-515;//Наименование_товара
      form6.DBGrid1.Columns[5].Title.Caption := 'Назва товару';
      form6.DBGrid1.Columns[6].Width:=50;//Цена_уе
      form6.DBGrid1.Columns[6].Title.Caption := 'Ціна, $';
      form6.DBGrid1.Columns[6].DisplayFormat:='0.00';
      form6.DBGrid1.Columns[7].Width:=50;//Курс
      form6.DBGrid1.Columns[7].Title.Caption := 'Курс';
      form6.DBGrid1.Columns[7].DisplayFormat:='0.00';
      form6.DBGrid1.Columns[8].Width:=60;//Вход
      form6.DBGrid1.Columns[8].Title.Caption := 'Вхід';
      form6.DBGrid1.Columns[8].DisplayFormat:='0.00';
      form6.DBGrid1.Columns[9].Width:=0;//Наличие
      form6.DBGrid1.Columns[10].Width:=0;//Дата_продажи
      form6.DBGrid1.Columns[11].Width:=0;//№_квитанции

      if form6.SQLQuery1.RecordCount=0 then form6.button3.Enabled:=false else form6.button3.Enabled:=true;

      if (form6.RadioButton2.checked=true) and (form6.CheckBox1.Checked=true) then
         begin
              form6.Button3.Enabled:=false;
              form6.DBGrid1.Columns[10].Width:=95;
              form6.DBGrid1.Columns[11].Width:=85;
              form6.DBGrid1.Columns[5].Width:=form6.DBGrid1.Columns[5].Width-form6.DBGrid1.Columns[10].Width-form6.DBGrid1.Columns[11].Width;
         end;
      form6.GroupBox2.Caption:='Наличие на складе: ['+inttostr(form6.SQLQuery1.RecordCount)+']';
end;

procedure TForm6.FormClose(Sender: TObject; var CloseAction: TCloseAction);
begin
     if form1.CheckBox2.Checked=true then find else rem_connect;
     kasa_connect;
     form1.Visible:=true;
     form1.Button1.SetFocus;
end;
//удаление записи
procedure TForm6.Button3Click(Sender: TObject);
begin
  if MessageDlg('Удаление товара', 'Удалить товар?', mtConfirmation, [mbYes, mbNo],0) = mrYes then
     begin
            SQLQuery1.Delete;//удаление выделенной записи из базы "Склад"
            sqlquery1.ApplyUpdates;// отправляем изменения в базу
            form1.SQLTransaction1.Commit;//без этого не работает
            SQLQuery1.Active:=false;
            SQLQuery1.Active:=true;
            size_columns;
      end;
end;
//Очистка поиска
procedure TForm6.Button4Click(Sender: TObject);
begin
     DateTimePicker1.Date:=date;
     DateTimePicker3.Date:=date;
     DateTimePicker5.Date:=date;
     DateTimePicker2.Date:=strtodate('01.01.2017');
     DateTimePicker4.Date:=strtodate('01.01.2017');
     ComboBox2.ItemIndex:=0;
     RadioButton1.Checked:=true;
     CheckBox1.Checked:=false;
     edit1.SetFocus;
end;

procedure TForm6.Button5Click(Sender: TObject);
begin
  Form6.Close;
end;

procedure TForm6.DBGrid1PrepareCanvas(sender: TObject; DataCol: Integer;
  Column: TColumn; AState: TGridDrawState);
begin
  //Полосатая заливка
      if odd(TDBGrid(Sender).DataSource.Dataset.RecNo) then TDBGrid(Sender).Canvas.Brush.Color :=RGBToColor(161,161,161);
end;

procedure TForm6.Edit4KeyPress(Sender: TObject; var Key: char);
begin
      if key='.' then key:=',';
      if not (Key in ['0'..'9', #8,#13,',','.'])then Key:=#0; {Фильтр ввода - только числа}
end;

procedure TForm6.Edit4KeyUp(Sender: TObject; var Key: Word; Shift: TShiftState);
begin
     if edit1.Text='' then edit1.text:='0';
end;

procedure TForm6.Edit5KeyPress(Sender: TObject; var Key: char);
begin
      if key='.' then key:=',';
      if not (Key in ['0'..'9', #8,#13,',','.'])then Key:=#0; {Фильтр ввода - только числа}
      if key=#13 then edit6.Text:=floattostr(strtofloat(edit5.Text)*strtofloat(edit4.text));
end;

//добавление записи
procedure TForm6.Button1Click(Sender: TObject);
var n:integer;
  InputText: TStringList;
  //переменные для буфера обмена
  ID_clipboard, Name_clipboard, s,s1,s2:string;
    kol_clipboard, n1, kolonka,n2:integer;
    dollar:Double;
begin
     if CheckBox2.Checked=false then
        begin
             for n := 1 to SpinEdit1.Value do
             begin
                  SQLQuery1.Append;
                  SQLQuery1.FieldByName('Приход').AsDateTime:=DateTimePicker1.Date;
                  SQLQuery1.FieldByName('Поставщик').AsString:=ComboBox1.Items[ComboBox1.ItemIndex];
                  SQLQuery1.FieldByName('Накладная').AsString:=edit1.Text;
                  SQLQuery1.FieldByName('Код_товара').AsString:=edit2.Text;
                  SQLQuery1.FieldByName('Наименование_расходника').AsString:=edit3.Text;
                  SQLQuery1.FieldByName('Курс').AsFloat:=StrToFloat(edit4.Text);
                  SQLQuery1.FieldByName('Цена_уе').Asfloat:=StrToFloat(edit5.Text);
                  SQLQuery1.FieldByName('Вход').AsFloat:=StrToFloat(edit6.Text);
                  SQLQuery1.FieldByName('Наличие').AsBoolean:=true;
                  Sqlquery1.Post;// записываем данные
                  sqlquery1.ApplyUpdates;// отправляем изменения в базу
             end;
             Edit2.SetFocus;
        end
    else  //преобразование данных из буфера обмена
    begin
         s:=Clipboard.AsText;
         If ComboBox1.ItemIndex=0 then
            begin
         while pos(#10,s)>0 do //разбиваем на строки
             begin
                  kolonka:=0;
                  n1:=pos(#10,s);
                  s1:=copy(s,0,n1);
                  while pos(#9,s1)>0 do     //вытаскиваем переменные
                      begin
                           inc(kolonka);
                           n2:=pos(#9,s1);
                           s2:=copy(s1,0,n2-1);
                           case kolonka of
                               1:ID_clipboard:=s2;
                               2:Name_clipboard:=s2;
                               3:kol_clipboard:=strtoint(s2);
                               4:begin s2:=copy(s2,0,length(s2)-3)+','+copy(s2,length(s2)-1,2); dollar:=StrToFloat(s2);end;
                           end;
                           s1:=copy(s1,n2+1,length(s1)-n2);
                      end;
                  for n := 1 to kol_clipboard do
                  begin
                        SQLQuery1.Append;
                        SQLQuery1.FieldByName('Приход').AsDateTime:=DateTimePicker1.Date;
                        SQLQuery1.FieldByName('Поставщик').AsString:=ComboBox1.Items[ComboBox1.ItemIndex];
                        SQLQuery1.FieldByName('Накладная').AsString:=edit1.Text;
                        SQLQuery1.FieldByName('Код_товара').AsString:=ID_clipboard;
                        SQLQuery1.FieldByName('Наименование_расходника').AsString:=Name_clipboard;
                        SQLQuery1.FieldByName('Курс').AsFloat:=StrToFloat(edit4.Text);
                        SQLQuery1.FieldByName('Цена_уе').Asfloat:=dollar;
                        SQLQuery1.FieldByName('Вход').AsFloat:=StrToFloat(edit4.Text)*dollar;
                        SQLQuery1.FieldByName('Наличие').AsBoolean:=true;
                        Sqlquery1.Post;// записываем данные
                        sqlquery1.ApplyUpdates;// отправляем изменения в базу
                  end;
                  s:=copy(s,n1+1,length(s)-n1);
             end;
          //последняя строка
          kolonka:=0;
          s1:=s;
          while pos(#9,s1)>0 do     //вытаскиваем переменные
              begin
                   inc(kolonka);
                   n2:=pos(#9,s1);
                   s2:=copy(s1,0,n2-1);
                   case kolonka of
                       1:ID_clipboard:=s2;
                       2:Name_clipboard:=s2;
                       3:kol_clipboard:=strtoint(s2);
                       4:begin s2:=copy(s2,0,length(s2)-3)+','+copy(s2,length(s2)-1,2); dollar:=StrToFloat(s2);end;
                   end;
                   s1:=copy(s1,n2+1,length(s1)-n2);
              end;
                  for n := 1 to kol_clipboard do
                  begin
                        SQLQuery1.Append;
                        SQLQuery1.FieldByName('Приход').AsDateTime:=DateTimePicker1.Date;
                        SQLQuery1.FieldByName('Поставщик').AsString:=ComboBox1.Items[ComboBox1.ItemIndex];
                        SQLQuery1.FieldByName('Накладная').AsString:=edit1.Text;
                        SQLQuery1.FieldByName('Код_товара').AsString:=ID_clipboard;
                        SQLQuery1.FieldByName('Наименование_расходника').AsString:=Name_clipboard;
                        SQLQuery1.FieldByName('Курс').AsFloat:=StrToFloat(edit4.Text);
                        SQLQuery1.FieldByName('Цена_уе').Asfloat:=dollar;
                        SQLQuery1.FieldByName('Вход').AsFloat:=StrToFloat(edit4.Text)*dollar;
                        SQLQuery1.FieldByName('Наличие').AsBoolean:=true;
                        Sqlquery1.Post;// записываем данные
                        sqlquery1.ApplyUpdates;// отправляем изменения в базу
                  end;
    end else if ComboBox1.ItemIndex=2 then    //ARC
       begin

            n:=0;
            while length(s)>0 do
            begin
                 inc(n);
                 if length(copy(s,0,pos(#10,s)))>0 then
                    begin
                         s1:=copy(s,0,pos(#10,s));
                         s:=copy(s,pos(#10,s)+1,Length(s)-pos(#10,s)+1);
                    end
                 else
                     begin
                          s1:=s;
                          s:='';
                     end;
                 case n of
                     1:Name_clipboard:=s1;
                     4:ID_clipboard:=s1;
                     8:begin kol_clipboard:=strtoint(Copy(s1, Pos(' ', s1) + 1, Pos(' ', Copy(s1, Pos(' ', s1) + 1, Length(s1))) - 1)); end;
                     10:begin
                          s2:=Copy(s1, 1, Pos('$', s1) - 1);
                          s2:=Copy(s2,1,Pos('.',s2)-1)+','+Copy(s2,Pos('.',s2)+1,Length(s2)-Pos('.',s2));
                          dollar:=strtofloat(s2);
                          for n2:=1 to kol_clipboard do
                          begin

                               SQLQuery1.Append;
                                SQLQuery1.FieldByName('Приход').AsDateTime:=DateTimePicker1.Date;
                                SQLQuery1.FieldByName('Поставщик').AsString:=ComboBox1.Items[ComboBox1.ItemIndex];
                                SQLQuery1.FieldByName('Накладная').AsString:=edit1.Text;
                                SQLQuery1.FieldByName('Код_товара').AsString:=ID_clipboard;
                                SQLQuery1.FieldByName('Наименование_расходника').AsString:=Name_clipboard;

                                SQLQuery1.FieldByName('Курс').AsFloat:=StrToFloat(edit4.Text);
                                SQLQuery1.FieldByName('Цена_уе').Asfloat:=dollar;
                                SQLQuery1.FieldByName('Вход').AsFloat:=StrToFloat(edit4.Text)*dollar;
                                SQLQuery1.FieldByName('Наличие').AsBoolean:=true;
                                Sqlquery1.Post;// записываем данные
                                sqlquery1.ApplyUpdates;// отправляем изменения в базу
                          end;
                     end;
                     12:n:=0;
                 end;
            end;
       end;
    end;
    form1.SQLTransaction1.Commit;
    SQLQuery1.Active:=false;
    SQLQuery1.Active:=true;
    edit2.Clear;
    edit3.Clear;
    edit5.text:='0';
    edit6.text:='0';
    SpinEdit1.Value:=1;
    button3.Enabled:=true;
    size_columns;
end;

procedure TForm6.Button2Click(Sender: TObject);
begin
  edit1.Clear;edit2.Clear;edit3.Clear;
  edit4.Text:='0';edit5.Text:='0';edit6.Text:='0';
  SpinEdit1.Value:=1;
  DateTimePicker1.Date:=Now;
end;

procedure TForm6.FormCreate(Sender: TObject);
begin
     sklad_connect;
     size_columns;
end;

procedure TForm6.FormShow(Sender: TObject);
begin
     OnCreate(Self);
     button4.Click;
end;

procedure TForm6.RadioButton1Click(Sender: TObject);
begin
     if RadioButton1.Checked=true then GroupBox5.Enabled:=false;
end;

procedure TForm6.RadioButton2Click(Sender: TObject);
begin
     if RadioButton2.Checked=true then GroupBox5.Enabled:=true;
end;

procedure TForm6.RadioButton3Click(Sender: TObject);
begin
     if RadioButton3.Checked=true then GroupBox5.Enabled:=false;
end;

procedure find_sklad;
begin
       form6.SQLQuery1.Active:=false;
       form6.SQLQuery1.sql.Clear;
       form6.SQLQuery1.SQL.Add('Select ID, Приход, Поставщик, Накладная, Код_товара, Наименование_расходника, ROUND(Цена_уе,2), ROUND(Курс,2), ROUND(Вход,2), Наличие, Дата_продажи, №_квитанции from Расходники where Наличие=:sost');
       form6.SQLQuery1.SQL.Add(' and (Приход>=:date1 and Приход<=:date2)');
       form6.SQLQuery1.ParamByName('date1').AsDate:=form6.DateTimePicker2.Date;
       form6.SQLQuery1.ParamByName('date2').AsDate:=form6.DateTimePicker3.Date;

       if form6.RadioButton1.Checked=true then form6.SQLQuery1.ParamByName('sost').AsBoolean:=true
       else
       begin
            form6.SQLQuery1.ParamByName('sost').AsBoolean:=false;
            form6.SQLQuery1.SQL.Add(' and (Дата_продажи>=:date3 and Дата_продажи<=:date4)');
            form6.SQLQuery1.ParamByName('date3').AsDate:=form6.DateTimePicker4.Date;
            form6.SQLQuery1.ParamByName('date4').AsDate:=form6.DateTimePicker5.Date+1;
       end;

       if form6.combobox2.text<>'Все' then form6.SQLQuery1.SQL.Add(' and Поставщик='''+form6.ComboBox2.Text+'''');
       form6.SQLQuery1.SQL.add(' ORDER BY Приход DESC');
       form6.SQLQuery1.Active:=true;
       size_columns;
end;

//включение фильтров
procedure TForm6.CheckBox1Click(Sender: TObject);
begin
  //проверка включен ли фильтр
  if Form6.CheckBox1.Checked=false then form6.OnCreate(self) else find_sklad;
end;
//отключение лишних элементов для импорта из контекста Интеха
procedure TForm6.CheckBox2Click(Sender: TObject);
begin
     if CheckBox2.Checked=true then
        begin
             edit2.Enabled:=false;edit3.Enabled:=false;edit5.Enabled:=false;edit6.Enabled:=false;
             SpinEdit1.Enabled:=false;
        end else
        begin
             edit2.Enabled:=true;edit3.Enabled:=true;edit5.Enabled:=true;edit6.Enabled:=true;
             SpinEdit1.Enabled:=true;
        end;
end;

procedure TForm6.CheckBox3Click(Sender: TObject);
begin
     sklad_connect;
     size_columns;
end;

//появление галочки "импорт из контекстного меню" для Интеха
procedure TForm6.ComboBox1Change(Sender: TObject);
begin
     if (ComboBox1.Items[ComboBox1.ItemIndex]='DFI') or (ComboBox1.Items[ComboBox1.ItemIndex]='ARC') then CheckBox2.Visible:=true else
     begin
          Checkbox2.Checked:=false;
          CheckBox2Click(Self);
          CheckBox2.Visible:=false;
     end;
end;

end.

