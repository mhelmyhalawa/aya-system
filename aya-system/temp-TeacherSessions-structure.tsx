  return (
    <div className="w-full mx-auto py-3 sm:py-6 px-0 sm:px-4" dir="rtl">
      <Card className="border border-green-300 shadow-lg sm:shadow-xl rounded-none md:rounded-2xl overflow-hidden">
        {/* الهيدر */}
        <CardHeader className="pb-2 sm:pb-4 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b-2 border-green-300/70 rounded-none md:rounded-t-2xl shadow-lg px-2 sm:px-4 sticky top-0 z-30">
          <div className="flex justify-between items-center gap-2 sm:gap-3 w-full">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-base sm:text-xl md:text-2xl font-extrabold text-white flex items-center gap-1 sm:gap-2 drop-shadow-md">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-100" />
                <span className="truncate">جلسات المعلمين</span>
              </CardTitle>
              <CardDescription className="text-green-100 text-xs sm:text-sm mt-0.5 sm:mt-1">
                إدارة جلسات المعلمين والحلقات المستقبلية
              </CardDescription>
            </div>

            {/* رابط العودة */}
            <Button
              variant="ghost"
              className="bg-white/10 hover:bg-white/20 text-white rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 flex items-center justify-center"
              onClick={() => onNavigate("Index")}
              title="العودة للرئيسية"
            >
              <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ثلث الصفحة الأول - اختيار الحلقة */}
            <div className="md:col-span-1">
              <div className="bg-white border border-green-200 rounded-xl shadow-md overflow-hidden">
                {/* هيدر اختيار الحلقة */}
                <div className="bg-gradient-to-r from-green-100 via-green-200 to-green-300 px-3 py-2 sm:px-4 sm:py-3 border-b border-green-300">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-green-800">
                      الحلقات
                    </h3>
                  </div>
                </div>

                {/* قائمة الحلقات */}
                <div className="p-3 sm:p-4">
                  {loading ? (
                    <div className="text-center py-8 flex flex-col items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full mb-2"></div>
                      <span className="text-green-700 font-medium">جاري التحميل...</span>
                    </div>
                  ) : circles.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 pb-1">
                      {circles.map((circle) => (
                        <div
                          key={circle.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col ${
                            selectedCircle === circle.id
                              ? "bg-green-100 border-green-300 shadow-md"
                              : "bg-white border-gray-200 hover:bg-green-50 hover:border-green-200"
                          }`}
                          onClick={() => handleCircleChange(circle.id)}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`rounded-full w-2 h-2 ${
                              selectedCircle === circle.id ? "bg-green-600" : "bg-gray-300"
                            }`}></div>
                            <h4 className="font-bold text-green-800 text-sm sm:text-base truncate">
                              {circle.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 ml-4">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>{circle.time_slot || "لم يحدد"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-green-600">
                      لا توجد حلقات متاحة
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* عرض الجلسات - ثلثي الصفحة */}
            <div className="md:col-span-2">
              <div className="bg-white border border-green-200 rounded-xl shadow-md overflow-hidden">
                {/* هيدر الجلسات */}
                <div className="bg-gradient-to-r from-green-100 via-green-200 to-green-300 px-3 py-2 sm:px-4 sm:py-3 border-b border-green-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-green-800">
                        {selectedCircle ? (
                          <span>الجلسات المستقبلية لحلقة: {getCircleName(selectedCircle)}</span>
                        ) : (
                          <span>الجلسات المستقبلية للحلقة</span>
                        )}
                      </h3>
                    </div>
                    {selectedCircle && (
                      <Button
                        onClick={handleAddSession}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        تسجيل جلسة جديدة
                      </Button>
                    )}
                  </div>
                </div>

                {/* عداد الجلسات والبيانات */}
                <div className="p-3 sm:p-4">
                  {/* عدد الجلسات */}
                  <div className="bg-green-50 rounded-lg border border-green-200 p-2 sm:p-3 mb-3 sm:mb-4">
                    <Badge variant="outline" className="text-green-800 border-green-400 text-xs sm:text-sm">
                      {circleSessions.length > 0
                        ? `عدد الجلسات المستقبلية: ${circleSessions.length}`
                        : "لا توجد جلسات مستقبلية"}
                    </Badge>
                  </div>

                  {/* جدول الجلسات */}
                  {loading ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full mb-2"></div>
                      <span className="text-green-700 font-medium">جاري التحميل...</span>
                    </div>
                  ) : selectedCircle ? (
                    circleSessions.length > 0 ? (
                      <div className="overflow-hidden">
                        <GenericTable
                          data={circleSessions.map((session, index) => ({
                            ...session,
                            id: `${session.study_circle_id}-${session.session_date}-${index}`
                          }))}
                          columns={[
                            {
                              key: 'session_date',
                              header: '📅 التاريخ',
                              align: 'right',
                              render: (session) => (
                                <div className="flex flex-col text-right">
                                  <span className="text-green-800 font-medium">{formatShortDate(session.session_date)}</span>
                                  <span className="text-xs text-green-600">{formatDateDisplay(session.session_date)}</span>
                                </div>
                              ),
                            },
                            {
                              key: 'time',
                              header: '⏰ الوقت',
                              align: 'right',
                              render: (session) => (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">{formatTimeDisplay(session.start_time)}</span>
                                  </div>
                                  <span className="text-gray-400 font-bold mx-1">—</span>
                                  <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-lg">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">{formatTimeDisplay(session.end_time)}</span>
                                  </div>
                                </div>
                              ),
                            },
                            {
                              key: 'notes',
                              header: '📝 ملاحظات',
                              align: 'right',
                              render: (session) => (
                                <span className="text-green-800 max-w-[200px] block">{session.notes || '—'}</span>
                              ),
                            },
                            {
                              key: 'actions',
                              header: '⚙️ إجراءات',
                              align: 'center',
                              render: (session) => (
                                <div className="flex justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditSession({ 
                                      study_circle_id: session.study_circle_id,
                                      session_date: session.session_date,
                                      start_time: session.start_time,
                                      end_time: session.end_time,
                                      notes: session.notes,
                                      teacher_id: session.teacher_id
                                    })}
                                    className="bg-green-200 hover:bg-green-300 text-green-900 rounded-md p-2 transition-colors"
                                    title="تعديل الجلسة"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSession({
                                      study_circle_id: session.study_circle_id,
                                      session_date: session.session_date,
                                      start_time: session.start_time,
                                      end_time: session.end_time,
                                      notes: session.notes,
                                      teacher_id: session.teacher_id
                                    })}
                                    className="bg-red-100 hover:bg-red-200 text-red-700 rounded-md p-2 transition-colors"
                                    title="حذف الجلسة"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ),
                            },
                          ]}
                          emptyMessage="لا توجد جلسات مستقبلية"
                          className="overflow-hidden rounded-xl border border-green-300 shadow-md"
                          getRowClassName={(_, index) =>
                            `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} cursor-pointer transition-colors`
                          }
                        />
                      </div>
                    ) : (
                      <div className="py-16 text-center">
                        <div className="bg-green-50 rounded-2xl p-6 max-w-md mx-auto border border-green-200 shadow-inner">
                          <Calendar className="w-12 h-12 text-green-300 mx-auto mb-3" />
                          <h3 className="text-lg font-bold text-green-800 mb-2">لا توجد جلسات مستقبلية</h3>
                          <p className="text-green-600 text-sm mb-4">
                            لا توجد جلسات مستقبلية مسجلة لهذه الحلقة
                          </p>
                          <Button
                            onClick={handleAddSession}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            تسجيل جلسة جديدة
                          </Button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="py-16 text-center">
                      <div className="bg-green-50 rounded-2xl p-6 max-w-md mx-auto border border-green-200 shadow-inner">
                        <BookOpen className="w-12 h-12 text-green-300 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-green-800 mb-2">اختر حلقة لعرض الجلسات</h3>
                        <p className="text-green-600 text-sm">
                          يرجى اختيار حلقة من القائمة على اليمين لعرض الجلسات المستقبلية الخاصة بها
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* نافذة إضافة جلسة جديدة */}
      <FormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="تسجيل جلسة جديدة"
        description="أدخل بيانات الجلسة الجديدة"
        onSubmit={handleSaveNewSession}
        submitText="حفظ الجلسة"
        cancelText="إلغاء"
        size="lg"
      >
        <FormRow>
          <div className="flex flex-col gap-2">
            <Label htmlFor="session_date">التاريخ</Label>
            <Input
              id="session_date"
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>
        </FormRow>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRow>
            <div className="flex flex-col gap-2">
              <Label htmlFor="start_time">وقت البدء</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
          </FormRow>

          <FormRow>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end_time">وقت الانتهاء</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </FormRow>
        </div>

        <FormRow>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي ملاحظات إضافية حول الجلسة..."
              className="h-24"
            />
          </div>
        </FormRow>
      </FormDialog>

      {/* نافذة تعديل الجلسة */}
      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="تعديل بيانات الجلسة"
        description="عدّل بيانات الجلسة المختارة"
        onSubmit={handleSaveEditedSession}
        submitText="حفظ التعديلات"
        cancelText="إلغاء"
        size="lg"
      >
        <FormRow>
          <div className="flex flex-col gap-2">
            <Label htmlFor="session_date">التاريخ</Label>
            <Input
              id="session_date"
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>
        </FormRow>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRow>
            <div className="flex flex-col gap-2">
              <Label htmlFor="start_time">وقت البدء</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
          </FormRow>

          <FormRow>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end_time">وقت الانتهاء</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </FormRow>
        </div>

        <FormRow>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي ملاحظات إضافية حول الجلسة..."
              className="h-24"
            />
          </div>
        </FormRow>
      </FormDialog>

      {/* نافذة تأكيد الحذف */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="تأكيد حذف الجلسة"
        description="هل أنت متأكد من رغبتك في حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={confirmDeleteSession}
        detailsTitle="بيانات الجلسة المراد حذفها:"
        details={sessionToDelete ? {
          "التاريخ": formatDateDisplay(sessionToDelete.session_date),
          "الوقت": sessionToDelete.start_time && sessionToDelete.end_time ? 
            `${formatTimeDisplay(sessionToDelete.start_time)} - ${formatTimeDisplay(sessionToDelete.end_time || "")}` :
            "-",
          "الملاحظات": sessionToDelete.notes || "-"
        } : null}
        deleteButtonText="نعم، قم بالحذف"
        cancelButtonText="إلغاء"
      />
    </div>
  );
