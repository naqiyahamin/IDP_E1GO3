  const banApplication = useCallback(async (appId: string) => {
    const { data: target } = await supabase.from('applications').select('student_email, equipment_code').eq('id', appId).single();
    if (!target) return;
    const studentEmail = (target.student_email as string).toLowerCase().trim();
    const equipmentCode = target.equipment_code as string;
    const [banRes, blacklistRes] = await Promise.all([
      supabase.from('applications').update({
        status: 'BANNED',
        stage: 'HISTORICAL',
        is_blacklisted: true,
        processed_at: new Date().toISOString(),
      }).eq('id', appId),
      supabase.from('blacklisted_emails').upsert({ email: studentEmail }),
    ]);
    if (banRes.error || blacklistRes.error) {
      console.error('Ban application failed:', banRes.error || blacklistRes.error);
      return;
    }
    const { data: otherActive } = await supabase
      .from('applications')
      .select('id')
      .neq('id', appId)
      .eq('equipment_code', equipmentCode)
      .in('stage', ['PENDING', 'ACTIVE_BORROW']);
    if (!otherActive || otherActive.length === 0) {
      const { error: equipmentError } = await supabase
        .from('equipment_rows')
        .update({ status: 'AVAILABLE' })
        .eq('code', equipmentCode);
      if (equipmentError) {
        console.error('Release equipment after ban failed:', equipmentError);
      }
    }
    await fetchAllData();
  }, [fetchAllData]);
  const submitReturnRequest = useCallback(async (appId: string, returnData: ReturnDetailsData) => {
    const { data: target } = await supabase.from('applications').select('equipment_code').eq('id', appId).single();
    if (!target) return;
    const [returnRes, equipmentRes] = await Promise.all([
      supabase.from('applications').update({
        is_returned: true,
        stage: 'RETURN_PENDING',
        return_date_returned: returnData.dateReturned,
        return_overseeing_staff: returnData.overseeingStaff,
        return_equipment_image: returnData.equipmentImage,
        return_submitted_at: new Date().toISOString(),
      }).eq('id', appId),
      supabase.from('equipment_rows').update({ status: 'RETURN_PENDING' }).eq('code', target.equipment_code as string),
    ]);
    if (returnRes.error || equipmentRes.error) {
      console.error('Submit return request failed:', returnRes.error || equipmentRes.error);
      return;
    }
    await fetchAllData();
  }, [fetchAllData]);
  const approveReturnRequest = useCallback(async (appId: string) => {
    const { data: target } = await supabase.from('applications').select('*').eq('id', appId).single();
    if (!target) return;
    const equipmentCode = target.equipment_code as string;
    const equipmentName = (target.equipment_name as string) || getEquipmentName(equipmentCode);
    const { data: invItem } = await supabase.from('component_inventory').select('*').eq('name', equipmentName).single();
    const [appRes, equipmentRes, inventoryRes, historyRes] = await Promise.all([
      supabase.from('applications').update({
        status: 'RETURNED',
        stage: 'HISTORICAL',
        is_return_verified: true,
        processed_at: new Date().toISOString(),
        return_verified_at: new Date().toISOString(),
      }).eq('id', appId),
      supabase.from('equipment_rows').update({
        status: 'AVAILABLE',
        last_date_used: target.return_date_returned || new Date().toISOString().split('T')[0],
      }).eq('code', equipmentCode),
      supabase.from('component_inventory').update({
        units_out: Math.max(0, (invItem?.units_out as number ?? 1) - 1),
        units_on_shelf: (invItem?.units_on_shelf as number ?? 0) + 1,
      }).eq('name', equipmentName),
      supabase.from('transaction_history').insert({
        equipment_code: equipmentCode,
        component_type: equipmentName,
        student_name: target.student_name,
        student_email: target.student_email,
        borrow_date: target.borrow_date,
        return_due_time: target.return_target,
        borrow_timestamp: target.approved_at || new Date().toISOString(),
        status: 'RETURNED',
        returned_date: target.return_date_returned || new Date().toISOString().split('T')[0],
      }),
    ]);
    const firstError = appRes.error || equipmentRes.error || inventoryRes.error || historyRes.error;
    if (firstError) {
      console.error('Approve return request failed:', firstError);
      return;
    }
    await fetchAllData();
  }, [fetchAllData]);
  const getLastSubmittedForm = useCallback(() => {
    if (applicationQueue.length === 0) return null;
    return applicationQueue[applicationQueue.length - 1].formData;
  }, [applicationQueue]);
  const resetUserPassword = useCallback((email: string, newPassword: string): boolean => {
    return updateUserPasswordInRegistry(email, newPassword);
  }, []);
  const incomingVerificationQueue = useMemo(
    () => applicationQueue.filter((app) => app.stage === 'PENDING' || app.stage === 'RETURN_PENDING'),
    [applicationQueue]
  );
  const processedApplicationsLog = useMemo(
    () => applicationQueue.filter((app) => app.stage === 'ACTIVE_BORROW'),
    [applicationQueue]
  );
  const historicalLedger = useMemo(
    () => applicationQueue.filter((app) => app.stage === 'HISTORICAL' || app.stage === 'BANNED'),
    [applicationQueue]
  );
  return (
    <AppContext.Provider
      value={{
        equipmentRows,
        applicationQueue,
        blacklistedEmails,
        componentInventory,
        transactionHistory,
        incomingVerificationQueue,
        processedApplicationsLog,
        historicalLedger,
        loading,
        updateEquipmentStatus,
        submitApplication,
        approveApplication,
        rejectApplication,
        banApplication,
        submitReturnRequest,
        approveReturnRequest,
        toggleBlacklistUser,
        getLastSubmittedForm,
        resetUserPassword,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}