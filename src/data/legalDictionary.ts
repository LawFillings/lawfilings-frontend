// Plain-English legal dictionary for LawFilings.
// Covers vocabulary used across District Courts, DRT/DRAT, NCLT/NCLAT,
// Consumer Commissions, High Courts, the Supreme Court, and private drafting.

export type DictionaryCategory =
  | 'general_procedure'
  | 'pleadings_documents'
  | 'evidence'
  | 'criminal_procedure'
  | 'civil_remedies'
  | 'tribunals_forums'
  | 'company_law'
  | 'property_law'
  | 'latin_maxims';

export interface DictionaryTerm {
  id: string;
  term: string;
  category: DictionaryCategory;
  definition: string;
  /** A short sentence showing the term used the way it actually appears in a filing, a
   *  judgment, or between legal professionals — not a restatement of the definition. */
  example: string;
  alsoKnownAs?: string[];
}

export const legalDictionaryTerms: DictionaryTerm[] = [
  // ─── General Procedure ───────────────────────────────────────────
  {
    id: 'plaint',
    term: 'Plaint',
    category: 'general_procedure',
    definition:
      'The written document a person files to start a civil case in court. It sets out who the parties are, what happened, and what the person wants the court to order.',
    example:
      'Counsel for the plaintiff filed the plaint before the District Judge, seeking recovery of ₹5,00,000 with interest.',
  },
  {
    id: 'written-statement',
    term: 'Written Statement',
    category: 'general_procedure',
    definition:
      'The formal written reply a defendant files in a civil case, answering the claims made in the plaint. It says which allegations are admitted, which are denied, and can raise the defendant\'s own defences.',
    example:
      'The defendant filed its written statement denying liability and pleading that the claim was time-barred.',
  },
  {
    id: 'affidavit',
    term: 'Affidavit',
    category: 'general_procedure',
    definition:
      'A written statement of facts that a person signs and swears to be true before a notary, oath commissioner, or other authorised officer. Courts accept it as a substitute for the person repeating those facts in person, for many procedural purposes.',
    example:
      'The petitioner annexed an affidavit affirming that the facts stated in the application were true to his knowledge.',
  },
  {
    id: 'decree',
    term: 'Decree',
    category: 'general_procedure',
    definition:
      'The formal, final expression of a court\'s decision in a civil suit that conclusively settles the rights of the parties on the matters in dispute. It is distinct from an "order," which usually deals with procedural or interim matters rather than finally deciding the case.',
    example:
      'Once the decree was passed in the plaintiff\'s favour, the defendant was directed to hand over vacant possession of the shop within thirty days.',
  },
  {
    id: 'judicial-order',
    term: 'Order',
    category: 'general_procedure',
    definition:
      'A formal direction issued by a court during a case, on procedural or interim matters, such as granting an adjournment or admitting a document. Unlike a decree, an order does not necessarily bring the case, or a substantive right in it, to a final conclusion.',
    example:
      'The court passed an order adjourning the hearing by two weeks to allow the defendant\'s counsel to file a reply.',
  },
  {
    id: 'ex-parte',
    term: 'Ex Parte',
    category: 'general_procedure',
    definition:
      'A hearing or order made when only one side is present, usually because the other party did not show up despite being served notice. An ex parte order can often be challenged or set aside if the absent party shows a good reason for missing the hearing.',
    example:
      'The court granted an ex parte ad-interim injunction since the defendant could not be served in time for the hearing.',
  },
  {
    id: 'limitation-period',
    term: 'Limitation Period',
    category: 'general_procedure',
    definition:
      'The time limit within which a person must file a case or take a particular legal step, counted from when the right to sue or act first arose. If a case is filed after this period without a valid reason for the delay, courts can refuse to hear it at all, regardless of its merits.',
    example:
      'Since the suit was filed four years after the cause of action arose, the defendant argued it was barred by the limitation period.',
  },
  {
    id: 'cause-of-action',
    term: 'Cause of Action',
    category: 'general_procedure',
    definition:
      'The set of facts that gives a person the legal right to sue someone else. A case cannot be filed, and a court will not entertain it, unless a genuine cause of action exists and is stated clearly.',
    example:
      'The plaint was rejected for disclosing no cause of action against the second defendant.',
  },
  {
    id: 'jurisdiction',
    term: 'Jurisdiction',
    category: 'general_procedure',
    definition:
      'The authority of a particular court or tribunal to hear and decide a case, based on factors like the subject matter, the value of the claim, and the location of the parties or property involved. Filing a case in the wrong forum, one that lacks jurisdiction, means it can be dismissed or transferred regardless of its merits.',
    example:
      'The tribunal held that it lacked jurisdiction to entertain the dispute, as the cause of action had arisen entirely outside its territorial limits.',
  },
  {
    id: 'locus-standi',
    term: 'Locus Standi',
    category: 'general_procedure',
    definition:
      'The legal right of a person to bring a particular case or be heard in it, because they are directly affected by the matter. A court can refuse to hear someone who lacks locus standi, even if their underlying complaint has substance.',
    example:
      'The respondent argued that a stranger to the transaction had no locus standi to challenge the sale deed.',
  },
  {
    id: 'adjournment',
    term: 'Adjournment',
    category: 'general_procedure',
    definition:
      'The postponement of a court hearing to a later date, usually granted on a request by one of the parties for a valid reason, such as needing more time to prepare or the unavailability of a lawyer.',
    example:
      'Counsel sought an adjournment on the ground that the client was out of station and could not give fresh instructions.',
  },
  {
    id: 'stay-order',
    term: 'Stay Order',
    category: 'general_procedure',
    definition:
      'An order by a court or tribunal that pauses or suspends a specific action, proceeding, or the operation of a lower order, until further directions are given. For example, a court can stay the enforcement of a decree while an appeal against it is pending.',
    example:
      'The High Court granted a stay order on execution of the decree pending disposal of the appeal.',
  },
  {
    id: 'condonation-of-delay',
    term: 'Condonation of Delay',
    category: 'general_procedure',
    definition:
      'A court order excusing a party for filing a case or an appeal after the normal limitation period has expired, granted when the party shows a sufficient and genuine reason for the delay. Without this, a late filing is normally rejected outright.',
    example:
      'The appellant filed an application for condonation of delay, explaining that the certified copy had reached him late due to a clerical error at the registry.',
  },
  {
    id: 'interlocutory-application',
    term: 'Interlocutory Application',
    category: 'general_procedure',
    definition:
      'A request made to a court or tribunal for an interim order or direction while the main case is still pending, rather than a final decision on the case itself. Common examples include applications for an interim injunction, for condonation of delay, or for permission to amend a pleading.',
    example:
      'The plaintiff moved an interlocutory application seeking an interim injunction restraining the defendant from alienating the property.',
    alsoKnownAs: ['IA'],
  },
  {
    id: 'show-cause-notice',
    term: 'Show Cause Notice',
    category: 'general_procedure',
    definition:
      'A formal notice asking a person or entity to explain, within a set time, why a particular action should not be taken against them. It gives the recipient a chance to respond before any adverse decision is made.',
    example:
      'The authority issued a show cause notice asking the licensee to explain within fifteen days why the licence should not be cancelled.',
  },
  {
    id: 'interim-order',
    term: 'Interim Order',
    category: 'general_procedure',
    definition:
      'A temporary order passed by a court while a case is still ongoing, meant to preserve the situation or protect a party\'s interests until the case is finally decided. It is not a ruling on the merits of the dispute itself.',
    example:
      'Pending final disposal of the writ petition, the court passed an interim order restraining coercive recovery action against the petitioner.',
  },
  {
    id: 'summary-suit',
    term: 'Summary Suit',
    category: 'general_procedure',
    definition:
      'A fast-track civil procedure used for certain types of claims, typically for recovery of a clear, fixed sum of money such as an unpaid bill or a debt on a written contract. It restricts the defendant\'s automatic right to contest the case and speeds up cases where the defence is unlikely to be genuine.',
    example:
      'The bank filed a summary suit for recovery of the unpaid amount due under the promissory note.',
  },
  {
    id: 'caveat',
    term: 'Caveat',
    category: 'general_procedure',
    definition:
      'A formal notice filed in a court, asking to be informed and heard before any order is passed on an anticipated application from the other side, such as an ex parte injunction. Once a caveat is filed, the court must give the person who filed it a chance to be heard first.',
    example:
      'The family lodged a caveat before the District Court, apprehending that the other side might move an ex parte application for probate.',
  },

  // ─── Pleadings & Documents ────────────────────────────────────────
  {
    id: 'petition',
    term: 'Petition',
    category: 'pleadings_documents',
    definition:
      'A formal written request to a court or tribunal asking it to take a particular action, used instead of a plaint in matters like writs, company law cases, matrimonial cases, or appeals to certain forums. Its structure and requirements vary depending on the forum and type of case.',
    example:
      'The petitioner filed a writ petition before the High Court challenging the order of the licensing authority.',
  },
  {
    id: 'memorandum-of-appeal',
    term: 'Memorandum of Appeal',
    category: 'pleadings_documents',
    definition:
      'The formal document filed to start an appeal, setting out the grounds on which the appellant challenges the lower court\'s or tribunal\'s decision. Each ground is usually listed as a separate numbered point explaining what was wrong with the earlier decision.',
    example:
      'The memorandum of appeal set out five separate grounds on which the appellant challenged the trial court\'s judgment.',
  },
  {
    id: 'vakalatnama',
    term: 'Vakalatnama',
    category: 'pleadings_documents',
    definition:
      'A document signed by a client authorising a specific lawyer or law firm to represent them in a case before a court. It must be filed before the lawyer can formally appear and act on the client\'s behalf.',
    example:
      'Before the matter was called, counsel filed the vakalatnama signed by the client authorising him to appear.',
  },
  {
    id: 'index-of-documents',
    term: 'Index',
    category: 'pleadings_documents',
    definition:
      'A list placed at the start of a court filing that summarises every document included in it, usually with page numbers. It helps the court and the other side quickly locate any particular document in the filing.',
    example:
      'The clerk checked the index at the start of the paper book before locating the impugned order on page 47.',
  },
  {
    id: 'annexure',
    term: 'Annexure',
    category: 'pleadings_documents',
    definition:
      'A supporting document, such as a contract, receipt, or letter, attached to a pleading or petition to back up the facts stated in it. Annexures are usually labelled with letters or numbers and referred to by that label in the main document.',
    example:
      'The plaintiff relied on the sale agreement, filed as Annexure A to the plaint, to establish the terms agreed between the parties.',
  },
  {
    id: 'verification-clause',
    term: 'Verification Clause',
    category: 'pleadings_documents',
    definition:
      'A short signed statement at the end of a pleading in which the person filing it confirms that its contents are true to their knowledge, or based on information they believe to be true. It is meant to hold the filer personally accountable for what is stated in the document.',
    example:
      'The petition concluded with a verification clause in which the petitioner affirmed that its contents were true to his knowledge.',
  },
  {
    id: 'cause-title',
    term: 'Cause Title',
    category: 'pleadings_documents',
    definition:
      'The heading at the top of a court document that names the court, the case number, and the parties involved, usually written as "Plaintiff versus Defendant." It identifies exactly which case the document belongs to.',
    example:
      'The cause title of the petition read: "ABC Pvt. Ltd. versus Union of India and Others."',
  },
  {
    id: 'prayer-clause',
    term: 'Prayer Clause',
    category: 'pleadings_documents',
    definition:
      'The part of a pleading or petition, usually at the end, that clearly states what specific relief or order the person is asking the court to grant. Courts generally do not grant relief that was not specifically asked for in the prayer clause.',
    example:
      'The prayer clause sought a permanent injunction restraining the defendant from interfering with the plaintiff\'s peaceful possession.',
  },
  {
    id: 'schedule-to-document',
    term: 'Schedule',
    category: 'pleadings_documents',
    definition:
      'A section at the end of a legal document, such as a deed or a plaint, that gives detailed information referred to elsewhere in the document, like a precise description and boundaries of a property. Keeping this detail in a separate schedule keeps the main text of the document easier to read.',
    example:
      'The precise boundaries of the property were described in the Schedule attached to the sale deed.',
  },
  {
    id: 'rejoinder',
    term: 'Rejoinder',
    category: 'pleadings_documents',
    definition:
      'A written response filed by the party who started a case, replying to the written statement or reply filed by the opposite party. It lets the original party respond to new points or defences that were raised.',
    example:
      'The plaintiff filed a rejoinder denying the new plea of limitation raised in the written statement.',
  },
  {
    id: 'counter-affidavit',
    term: 'Counter-Affidavit',
    category: 'pleadings_documents',
    definition:
      'An affidavit filed by one party in reply to an affidavit or application filed by the opposing party, disputing or responding to the facts and claims made in it.',
    example:
      'The respondent filed a counter-affidavit disputing the petitioner\'s claim that no opportunity of hearing had been given.',
  },
  {
    id: 'legal-notice',
    term: 'Legal Notice',
    category: 'pleadings_documents',
    definition:
      'A formal written communication sent to another person or entity, usually through a lawyer, informing them of a grievance and warning of legal action if it is not resolved within a stated time. Sending one is often a required or advisable step before filing certain types of cases.',
    example:
      'Before filing the suit, the plaintiff\'s advocate sent a legal notice calling upon the defendant to clear the outstanding dues within fifteen days.',
  },
  {
    id: 'written-submissions',
    term: 'Written Submissions',
    category: 'pleadings_documents',
    definition:
      'A document in which a party sets out, in writing, the arguments and legal points they want the court to consider, often filed after oral arguments have been made or in place of a lengthy oral hearing. Courts frequently refer back to written submissions while drafting their final decision.',
    example:
      'After the arguments concluded, both counsel were directed to file written submissions within a week.',
  },
  {
    id: 'certified-copy',
    term: 'Certified Copy',
    category: 'pleadings_documents',
    definition:
      'An official copy of a court order, judgment, or document, stamped and signed by the court\'s registry to confirm it is a true and accurate copy of the original on record. Certified copies are often required to file an appeal or to prove a document\'s contents elsewhere.',
    example:
      'The appellant annexed a certified copy of the trial court\'s judgment along with the memorandum of appeal.',
  },
  {
    id: 'memorandum-of-parties',
    term: 'Memorandum of Parties',
    category: 'pleadings_documents',
    definition:
      'A list at the start of a petition or appeal naming every party to the case along with their addresses, distinct from the shorter cause title. It is used in filings, such as before the High Courts and Supreme Court, that require full party details set out separately.',
    example:
      'The memorandum of parties listed the full names and addresses of all seven respondents to the petition.',
  },
  {
    id: 'synopsis-and-list-of-dates',
    term: 'Synopsis and List of Dates',
    category: 'pleadings_documents',
    definition:
      'A short summary of the case background, along with a chronological table of the key events and their dates, filed at the start of petitions in the High Courts and Supreme Court. It helps the judge quickly grasp the case history before reading the full petition.',
    example:
      'The special leave petition opened with a synopsis and list of dates setting out the chronology of proceedings before the High Court.',
  },

  // ─── Evidence ─────────────────────────────────────────────────────
  {
    id: 'examination-in-chief',
    term: 'Examination-in-Chief',
    category: 'evidence',
    definition:
      'The first round of questioning of a witness, conducted by the lawyer for the side that called that witness to testify. Its purpose is to bring out the facts that support that side\'s case.',
    example:
      'During examination-in-chief, the witness identified the signature on the agreement as his own.',
  },
  {
    id: 'cross-examination',
    term: 'Cross-Examination',
    category: 'evidence',
    definition:
      'The questioning of a witness by the lawyer for the opposing side, after examination-in-chief is over. Its purpose is to test the witness\'s account, expose weaknesses or contradictions, and challenge their credibility.',
    example:
      'In cross-examination, the defendant\'s counsel confronted the witness with his earlier statement to the police.',
  },
  {
    id: 're-examination',
    term: 'Re-Examination',
    category: 'evidence',
    definition:
      'A further round of questioning by the side that originally called a witness, conducted after cross-examination, limited to clarifying points that came up during the cross-examination.',
    example:
      'In re-examination, the witness clarified that the date mentioned earlier was a typographical error.',
  },
  {
    id: 'hearsay',
    term: 'Hearsay',
    category: 'evidence',
    definition:
      'A statement a witness makes in court about something they were told by someone else, rather than something they personally saw or experienced. Hearsay is generally not treated as reliable evidence, though there are recognised exceptions where it can be admitted.',
    example:
      'The court refused to rely on the witness\'s account of what his neighbour had told him, holding it to be inadmissible hearsay.',
  },
  {
    id: 'burden-of-proof',
    term: 'Burden of Proof',
    category: 'evidence',
    definition:
      'The overall legal obligation on a party to prove the facts they are claiming, so that if they present no evidence at all, they lose on that point. In most civil and criminal cases, this responsibility is fixed by law at the outset and generally does not move to the other side.',
    example:
      'Since the plaintiff alleged fraud, the burden of proof lay on him to establish it with cogent evidence.',
  },
  {
    id: 'deposition',
    term: 'Deposition',
    category: 'evidence',
    definition:
      'The formal record of a witness\'s sworn testimony, taken down in the course of examination-in-chief, cross-examination, and re-examination. It becomes part of the official case record that the court relies on while deciding the case.',
    example:
      'The deposition of the sole eyewitness ran to nearly forty pages of the trial record.',
  },
  {
    id: 'exhibit-evidence',
    term: 'Exhibit',
    category: 'evidence',
    definition:
      'A document or object that has been formally admitted into evidence during a case and marked with a reference number or letter so it can be identified later. Once marked as an exhibit, the court and both sides can refer to it by that marking throughout the rest of the case.',
    example:
      'The sale agreement was marked as Exhibit P-1 during the plaintiff\'s evidence.',
  },
  {
    id: 'documentary-evidence',
    term: 'Documentary Evidence',
    category: 'evidence',
    definition:
      'Evidence in the form of written or recorded material, such as contracts, letters, receipts, or electronic records, presented to prove a fact in a case. It is distinguished from oral evidence, which is testimony given by a witness in person.',
    example:
      'The bank relied entirely on documentary evidence, including the loan agreement and statement of accounts, to prove the default.',
  },
  {
    id: 'oral-evidence',
    term: 'Oral Evidence',
    category: 'evidence',
    definition:
      'Evidence given by a witness speaking directly before the court, usually under oath, as opposed to documentary evidence in written or recorded form. Oral evidence is normally taken and recorded through examination-in-chief, cross-examination, and re-examination.',
    example:
      'In the absence of any written agreement, the plaintiff had to prove the terms of the contract through oral evidence alone.',
  },
  {
    id: 'admission-evidence',
    term: 'Admission',
    category: 'evidence',
    definition:
      'A statement, made orally, in writing, or through conduct, in which a party accepts a fact that goes against their own interest in the case. Courts treat admissions as strong evidence, since a person is unlikely to accept something untrue that hurts their own case.',
    example:
      'The defendant\'s letter acknowledging the outstanding balance was treated by the court as a clear admission of liability.',
  },
  {
    id: 'onus-of-proof',
    term: 'Onus of Proof',
    category: 'evidence',
    definition:
      'The obligation to produce evidence on a specific issue at a particular stage of the trial, as distinct from the overall burden of proof. Unlike the burden of proof, the onus can shift back and forth between the parties as each side produces or fails to produce evidence on a point.',
    example:
      'Once the plaintiff proved execution of the promissory note, the onus of proof shifted to the defendant to show that it had been repaid.',
  },
  {
    id: 'hostile-witness',
    term: 'Hostile Witness',
    category: 'evidence',
    definition:
      'A witness who, while giving testimony, contradicts the earlier statement they gave to the party that called them, or otherwise appears unwilling to support that party\'s case. Once a court declares a witness hostile, the party that called them may be allowed to question them more directly, similar to a cross-examination.',
    example:
      'When the witness denied his earlier statement to the police, the prosecution sought and obtained permission to declare him hostile.',
  },
  {
    id: 'expert-opinion',
    term: 'Expert Opinion',
    category: 'evidence',
    definition:
      'The opinion of a person with special skill or knowledge in a particular field, such as a doctor, forensic examiner, or handwriting expert, presented as evidence on a technical question the court cannot assess on its own. The court weighs an expert\'s opinion along with the rest of the evidence rather than being bound to accept it.',
    example:
      'The court called for the expert opinion of a handwriting expert to determine whether the signature on the will was genuine.',
  },
  {
    id: 'circumstantial-evidence',
    term: 'Circumstantial Evidence',
    category: 'evidence',
    definition:
      'Evidence that does not directly prove a fact but allows the court to reasonably infer it from a chain of related circumstances. Courts can convict or decide a case based on circumstantial evidence alone, but usually only when the circumstances, taken together, point conclusively to one explanation.',
    example:
      'In the absence of any eyewitness, the prosecution\'s case rested entirely on circumstantial evidence.',
  },
  {
    id: 'corroboration',
    term: 'Corroboration',
    category: 'evidence',
    definition:
      'Independent evidence that supports and confirms another piece of evidence already given, such as a second witness backing up the first witness\'s account. Certain kinds of evidence are treated as more reliable, or in some situations are required by practice, when they are corroborated.',
    example:
      'The trial court accepted the complainant\'s testimony, noting that it found ample corroboration in the medical evidence on record.',
  },
  {
    id: 'presumption',
    term: 'Presumption',
    category: 'evidence',
    definition:
      'A conclusion that the law allows, or requires, a court to draw from certain facts unless it is disproved by evidence to the contrary. For example, a document that is more than a certain number of years old and produced from proper custody may be presumed genuine without separate proof.',
    example:
      'The court invoked the presumption available in law and accepted the thirty-year-old document as genuine, since it was produced from proper custody.',
  },

  // ─── Criminal Procedure ─────────────────────────────────────────
  {
    id: 'first-information-report',
    term: 'First Information Report',
    category: 'criminal_procedure',
    definition:
      'The written record the police prepare when they first receive information about a cognizable offence, marking the formal start of a criminal investigation. It is filed under the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS), which is the code that replaced the CrPC.',
    example:
      'The complainant lodged a First Information Report at the local police station alleging theft of his vehicle.',
    alsoKnownAs: ['FIR'],
  },
  {
    id: 'chargesheet',
    term: 'Chargesheet',
    category: 'criminal_procedure',
    definition:
      'The report the police file with the magistrate at the end of an investigation, setting out the evidence collected and, if it supports a case, naming the accused persons to be tried. It is formally called the police report or final report under the BNSS, the code that replaced the CrPC.',
    example:
      'After completing the investigation, the police filed the chargesheet before the magistrate, naming three accused persons.',
    alsoKnownAs: ['Final Report', 'Police Report'],
  },
  {
    id: 'bail',
    term: 'Bail',
    category: 'criminal_procedure',
    definition:
      'The release of a person accused of a crime from custody, usually on conditions such as a bond or surety, pending trial or further proceedings. It is not an acquittal or a finding of innocence, only a release from detention while the case continues.',
    example:
      'The accused moved an application for bail, undertaking to cooperate with the investigation and not tamper with evidence.',
  },
  {
    id: 'anticipatory-bail',
    term: 'Anticipatory Bail',
    category: 'criminal_procedure',
    definition:
      'A court order granted in advance, before a person is actually arrested, directing that they be released on bail if arrested for a particular allegation. It is meant to protect a person who has reason to believe they may be falsely or unfairly arrested.',
    example:
      'Apprehending arrest on a false complaint, the accused applied for anticipatory bail before the Sessions Court.',
  },
  {
    id: 'cognizable-offence',
    term: 'Cognizable Offence',
    category: 'criminal_procedure',
    definition:
      'A category of offence, generally more serious, where the police can register an FIR and begin investigating or arrest the accused without needing prior permission from a magistrate.',
    example:
      'Since the allegation involved a cognizable offence, the police registered the FIR without needing the magistrate\'s prior permission.',
  },
  {
    id: 'non-cognizable-offence',
    term: 'Non-Cognizable Offence',
    category: 'criminal_procedure',
    definition:
      'A category of offence, generally less serious, where the police cannot investigate or arrest the accused without first getting permission from a magistrate. A complainant in such a case usually has to approach the magistrate directly rather than simply filing an FIR at a police station.',
    example:
      'As the matter was a non-cognizable offence, the complainant had to approach the magistrate directly instead of the police station.',
  },
  {
    id: 'summons',
    term: 'Summons',
    category: 'criminal_procedure',
    definition:
      'A formal court order directing a person to appear before the court on a specified date, used when the court does not consider it necessary to have that person arrested. Ignoring a summons can lead the court to escalate the matter, including by issuing a warrant.',
    example:
      'The magistrate issued summons directing the accused to appear before the court on the next date of hearing.',
  },
  {
    id: 'warrant',
    term: 'Warrant',
    category: 'criminal_procedure',
    definition:
      'A written order issued by a court directing the police to arrest a person and produce them before the court. A "bailable" warrant allows the person to be released on bail as soon as they are arrested, while a "non-bailable" warrant requires them to be brought before the court first.',
    example:
      'When the accused repeatedly failed to appear despite summons, the court issued a non-bailable warrant against him.',
  },
  {
    id: 'remand',
    term: 'Remand',
    category: 'criminal_procedure',
    definition:
      'An order sending an arrested person into custody, either with the police for further investigation or to judicial custody, for a limited period while the investigation or trial continues.',
    example:
      'The police produced the accused before the magistrate and sought his remand to police custody for further interrogation.',
  },
  {
    id: 'discharge-criminal',
    term: 'Discharge',
    category: 'criminal_procedure',
    definition:
      'An order by which a court releases an accused person from a criminal case before trial, because it finds there is not enough evidence, even on the face of it, to proceed against them. A discharge is different from an acquittal, which comes only after a full trial on the evidence.',
    example:
      'Finding no material connecting the accused to the offence, the court discharged him before the framing of charge.',
  },
  {
    id: 'acquittal',
    term: 'Acquittal',
    category: 'criminal_procedure',
    definition:
      'A court\'s final finding, after a full trial, that the accused is not guilty of the offence charged. It clears the accused of that charge and, subject to limited exceptions, they generally cannot be tried again for the same offence.',
    example:
      'After a full trial, the court recorded an acquittal, holding that the prosecution had failed to prove its case beyond reasonable doubt.',
  },
  {
    id: 'complainant',
    term: 'Complainant',
    category: 'criminal_procedure',
    definition:
      'The person who brings a criminal complaint to a court or police station, alleging that an offence has been committed, as distinct from the accused against whom the allegation is made.',
    example:
      'The complainant deposed that he had personally witnessed the assault on the date in question.',
  },
  {
    id: 'accused',
    term: 'Accused',
    category: 'criminal_procedure',
    definition:
      'The person against whom a criminal allegation has been made and who is being investigated, charged, or tried for an offence. An accused is presumed innocent until proven guilty by the court.',
    example:
      'The accused pleaded not guilty when the charges were read out to him.',
  },
  {
    id: 'investigating-officer',
    term: 'Investigating Officer',
    category: 'criminal_procedure',
    definition:
      'The police officer responsible for investigating a criminal case, including collecting evidence, recording witness statements, and ultimately filing the chargesheet or closing the case.',
    example:
      'The investigating officer recorded the statements of the witnesses and seized the disputed documents during the investigation.',
  },
  {
    id: 'cognizance',
    term: 'Cognizance',
    category: 'criminal_procedure',
    definition:
      'The formal step by which a magistrate takes judicial notice of an offence and decides to proceed with the case, based on a complaint, a police report, or the magistrate\'s own information. Until cognizance is taken, a matter has not formally become a case before that court.',
    example:
      'The magistrate took cognizance of the offence on the basis of the police report and issued summons to the accused.',
  },
  {
    id: 'framing-of-charge',
    term: 'Framing of Charge',
    category: 'criminal_procedure',
    definition:
      'The stage at which a court formally spells out, in writing, the specific offence or offences the accused is alleged to have committed, based on the evidence available so far. The trial proceeds on the basis of these framed charges, and the accused is asked to plead guilty or not guilty to them.',
    example:
      'At the stage of framing of charge, the court found sufficient material to proceed against the accused and read out the charges to him.',
  },
  {
    id: 'compounding-of-offence',
    term: 'Compounding of Offence',
    category: 'criminal_procedure',
    definition:
      'A process by which the complainant and the accused settle certain criminal cases between themselves, with the court\'s permission where required, bringing the case to an end without a full trial. Only offences the law specifically allows to be compounded can be settled this way; serious offences generally cannot be.',
    example:
      'Since the dispute was purely personal, the parties sought the court\'s permission for compounding of offence and settling the matter.',
  },

  // ─── Civil Remedies ───────────────────────────────────────────────
  {
    id: 'temporary-injunction',
    term: 'Temporary Injunction',
    category: 'civil_remedies',
    definition:
      'A court order that temporarily stops a party from doing a particular act, such as selling a disputed property, while the main case is still being decided. It is meant to preserve the situation as it stands so the final decision is not made meaningless by actions taken in the meantime.',
    example:
      'The plaintiff sought a temporary injunction restraining the defendant from selling the disputed flat until the suit was decided.',
  },
  {
    id: 'permanent-injunction',
    term: 'Permanent Injunction',
    category: 'civil_remedies',
    definition:
      'A final court order, granted at the conclusion of a case, permanently restraining a party from doing a specific act. Unlike a temporary injunction, it is not a stopgap measure but part of the court\'s final decision on the case.',
    example:
      'The trial court decreed the suit, granting a permanent injunction restraining the defendant from interfering with the plaintiff\'s possession.',
  },
  {
    id: 'specific-performance',
    term: 'Specific Performance',
    category: 'civil_remedies',
    definition:
      'A court order directing a party to actually carry out their obligations under a contract, such as completing the sale of a specific property, rather than simply paying compensation for breaking it. Courts grant this remedy mainly when money alone would not adequately make up for the breach.',
    example:
      'The buyer filed a suit for specific performance, asking the court to direct the seller to execute the sale deed as agreed.',
  },
  {
    id: 'damages',
    term: 'Damages',
    category: 'civil_remedies',
    definition:
      'A sum of money a court orders one party to pay another as compensation for loss or injury caused by a wrong, such as a breach of contract or a tort. The amount is meant to place the wronged party, as far as money can, in the position they would have been in had the wrong not occurred.',
    example:
      'The plaintiff claimed damages of ₹10,00,000 for the loss caused by the defendant\'s breach of contract.',
  },
  {
    id: 'preliminary-decree',
    term: 'Preliminary Decree',
    category: 'civil_remedies',
    definition:
      'A decree that decides the rights of the parties on a matter but leaves some further steps, such as accounting or dividing property, to be worked out before the case can be completely closed. It is followed by a final decree once those remaining steps are finished.',
    example:
      'The trial court passed a preliminary decree in the partition suit, directing that a final decree be drawn up after the shares were ascertained by a local commissioner.',
  },
  {
    id: 'final-decree',
    term: 'Final Decree',
    category: 'civil_remedies',
    definition:
      'The decree that completely disposes of a suit, issued either directly or after a preliminary decree once all the remaining questions, such as the exact division of property, have been worked out.',
    example:
      'Once the commissioner\'s report on division of the property was accepted, the court passed the final decree.',
  },
  {
    id: 'execution-of-decree',
    term: 'Execution of Decree',
    category: 'civil_remedies',
    definition:
      'The legal process by which a party who has won a case gets the court\'s decree actually enforced, for example by seizing the losing party\'s property or recovering money owed. Winning a case does not automatically mean the relief is handed over; execution proceedings are often needed to make it happen in practice.',
    example:
      'Having received no voluntary payment, the decree-holder filed execution proceedings to recover the amount by attaching the defendant\'s property.',
  },
  {
    id: 'review-civil',
    term: 'Review',
    category: 'civil_remedies',
    definition:
      'A request made to the same court that passed a judgment or order, asking it to reconsider its own decision, usually because of a clear factual or legal error apparent on the record, or newly discovered evidence. It is narrower than an appeal, which is heard by a higher court, and a revision, which examines whether a lower court acted within its jurisdiction.',
    example:
      'The respondent filed a review petition before the same court, pointing out that a crucial document had been overlooked while passing the order.',
  },
  {
    id: 'revision-civil',
    term: 'Revision',
    category: 'civil_remedies',
    definition:
      'An application to a higher court asking it to examine whether a lower court acted within its jurisdiction and followed proper procedure in a case, rather than re-examining the correctness of its findings on the facts. It is more limited in scope than an appeal, which can go into the merits of the decision itself.',
    example:
      'The tenant filed a revision before the District Judge, contending that the Rent Controller had acted beyond its jurisdiction.',
  },
  {
    id: 'appeal',
    term: 'Appeal',
    category: 'civil_remedies',
    definition:
      'A request to a higher court to review and overturn a lower court\'s decision on its merits, including its findings of fact and law. This is broader than a revision, which mainly checks whether the lower court kept within its jurisdiction and followed proper procedure, and broader than a review, which asks the same court to reconsider its own decision for a clear error.',
    example:
      'Aggrieved by the trial court\'s decree, the defendant filed a first appeal before the District Judge.',
  },
  {
    id: 'suit-for-recovery',
    term: 'Suit for Recovery',
    category: 'civil_remedies',
    definition:
      'A civil case filed to recover a sum of money owed by one person to another, such as an unpaid loan, unpaid dues under a contract, or the price of goods sold.',
    example:
      'The plaintiff filed a suit for recovery of ₹3,50,000 along with interest, being the balance due under the supply contract.',
  },
  {
    id: 'declaratory-suit',
    term: 'Declaratory Suit',
    category: 'civil_remedies',
    definition:
      'A civil case in which a person asks the court to formally declare their legal right or status, such as their title to a property, rather than asking the court to also order some further relief like recovery of possession.',
    example:
      'The plaintiff filed a declaratory suit asking the court to declare him the lawful owner of the disputed land.',
  },
  {
    id: 'partition-suit',
    term: 'Partition Suit',
    category: 'civil_remedies',
    definition:
      'A civil case filed by a co-owner of a property, most commonly among family members, asking the court to divide the property and mark out each owner\'s separate share.',
    example:
      'One of the four siblings filed a partition suit seeking his one-fourth share in the ancestral property.',
  },
  {
    id: 'restitution',
    term: 'Restitution',
    category: 'civil_remedies',
    definition:
      'An order restoring a party to the position they were in before a decree or order that has since been reversed or modified on appeal, typically by requiring the other party to return money or property they had received under it.',
    example:
      'After the appellate court reversed the decree, it ordered restitution, directing the plaintiff to return the amount he had already recovered.',
  },
  {
    id: 'set-off-and-counterclaim',
    term: 'Set-Off and Counterclaim',
    category: 'civil_remedies',
    definition:
      'A set-off lets a defendant reduce or cancel out what they owe the plaintiff by pointing to a separate debt the plaintiff owes them. A counterclaim goes further, letting the defendant raise their own independent claim against the plaintiff within the same case, rather than filing a separate suit.',
    example:
      'The defendant pleaded a set-off for unpaid invoices and also filed a counterclaim for damages arising from the same transaction.',
  },
  {
    id: 'mesne-profits',
    term: 'Mesne Profits',
    category: 'civil_remedies',
    definition:
      'The compensation a court can order a person to pay for wrongfully occupying and using someone else\'s property, calculated based on the profit or benefit they gained, or that the rightful owner lost, during that period of wrongful possession.',
    example:
      'Along with possession, the plaintiff also claimed mesne profits for the period the defendant had wrongfully occupied the shop.',
  },

  // ─── Tribunals & Forums ───────────────────────────────────────────
  {
    id: 'original-application',
    term: 'Original Application',
    category: 'tribunals_forums',
    definition:
      'The main case document filed by a bank or financial institution before a Debt Recovery Tribunal (DRT) to recover money owed by a borrower, similar in role to a plaint in a civil court.',
    example:
      'The bank filed an Original Application before the Debt Recovery Tribunal seeking recovery of the outstanding loan amount.',
    alsoKnownAs: ['OA'],
  },
  {
    id: 'securitisation-application',
    term: 'Securitisation Application',
    category: 'tribunals_forums',
    definition:
      'An application filed before a Debt Recovery Tribunal by a borrower or other affected person, challenging measures a lender has taken to seize or sell secured property under the SARFAESI Act.',
    example:
      'The borrower filed a Securitisation Application before the DRT challenging the bank\'s possession notice under the SARFAESI Act.',
    alsoKnownAs: ['SA'],
  },
  {
    id: 'sarfaesi',
    term: 'SARFAESI',
    category: 'tribunals_forums',
    definition:
      'Short for the Securitisation and Reconstruction of Financial Assets and Enforcement of Security Interest Act, 2002. It lets banks and certain financial institutions seize and sell property pledged as security for a loan directly, without first having to sue in court, when the borrower defaults.',
    example:
      'Since the borrower defaulted on the loan, the bank invoked its powers under the SARFAESI Act to take possession of the mortgaged property.',
  },
  {
    id: 'recovery-certificate',
    term: 'Recovery Certificate',
    category: 'tribunals_forums',
    definition:
      'A certificate issued by a Debt Recovery Tribunal, after deciding an Original Application in favour of the lender, authorising the amount due to be recovered from the borrower, including by attaching and selling their property.',
    example:
      'After the Original Application was allowed, the DRT issued a recovery certificate authorising recovery of the decretal amount from the borrower.',
  },
  {
    id: 'debt-recovery-officer',
    term: 'Debt Recovery Officer',
    category: 'tribunals_forums',
    definition:
      'The officer attached to a Debt Recovery Tribunal responsible for actually carrying out the recovery process once a Recovery Certificate has been issued, such as attaching and auctioning the borrower\'s property.',
    example:
      'The Debt Recovery Officer proceeded to attach the borrower\'s bank account pursuant to the recovery certificate.',
  },
  {
    id: 'cirp',
    term: 'Corporate Insolvency Resolution Process',
    category: 'tribunals_forums',
    definition:
      'The process, conducted under the Insolvency and Bankruptcy Code, by which a company that has defaulted on its debts is taken over by an appointed resolution professional, who works with its creditors to either revive it under a resolution plan or move it toward liquidation.',
    example:
      'The financial creditor filed an application to initiate the Corporate Insolvency Resolution Process against the corporate debtor for default in repayment.',
    alsoKnownAs: ['CIRP'],
  },
  {
    id: 'miscellaneous-application',
    term: 'Miscellaneous Application',
    category: 'tribunals_forums',
    definition:
      'An application filed before the NCLT or NCLAT seeking a specific direction or relief connected to a pending case, such as seeking a procedural clarification, rather than raising a wholly new claim.',
    example:
      'The resolution professional filed a miscellaneous application before the NCLT seeking an extension of the resolution process timeline.',
    alsoKnownAs: ['MA'],
  },
  {
    id: 'resolution-plan',
    term: 'Resolution Plan',
    category: 'tribunals_forums',
    definition:
      'A plan submitted during the Corporate Insolvency Resolution Process by a prospective buyer or investor, proposing how a financially distressed company would be revived and how its creditors would be paid. It must be approved by the Committee of Creditors and then by the NCLT before it takes effect.',
    example:
      'The Committee of Creditors approved the resolution plan submitted by the successful applicant and placed it before the NCLT for sanction.',
  },
  {
    id: 'committee-of-creditors',
    term: 'Committee of Creditors',
    category: 'tribunals_forums',
    definition:
      'The body made up mainly of a company\'s financial creditors, formed during the Corporate Insolvency Resolution Process, that decides key matters such as which resolution plan to approve or whether the company should instead be liquidated.',
    example:
      'The Committee of Creditors met to consider the resolution plans received from the prospective resolution applicants.',
    alsoKnownAs: ['CoC'],
  },
  {
    id: 'operational-creditor',
    term: 'Operational Creditor',
    category: 'tribunals_forums',
    definition:
      'A creditor to whom a company owes money for goods supplied or services rendered, such as a vendor or supplier, as distinct from a financial creditor to whom the company owes money that was lent or advanced.',
    example:
      'The vendor, being an operational creditor owed money for goods supplied, filed its claim before the resolution professional.',
  },
  {
    id: 'financial-creditor',
    term: 'Financial Creditor',
    category: 'tribunals_forums',
    definition:
      'A creditor to whom a company owes a debt that arises from money lent or a similar financial arrangement, such as a bank loan or debentures, as distinct from an operational creditor who is owed money for goods or services.',
    example:
      'The bank, as a financial creditor, filed its claim along with the loan documents before the interim resolution professional.',
  },
  {
    id: 'consumer-complaint',
    term: 'Complaint',
    category: 'tribunals_forums',
    definition:
      'The document filed by a consumer before a Consumer Commission alleging a deficiency in service, a defect in goods, or an unfair trade practice by a seller or service provider, and asking for compensation or another remedy.',
    example:
      'The consumer filed a complaint before the District Commission alleging that the newly purchased appliance was defective.',
  },
  {
    id: 'opposite-party',
    term: 'Opposite Party',
    category: 'tribunals_forums',
    definition:
      'The seller, manufacturer, or service provider against whom a consumer files a complaint before a Consumer Commission, equivalent to a defendant in an ordinary civil case.',
    example:
      'The opposite party filed its written version denying any deficiency in the service rendered.',
  },
  {
    id: 'deficiency-in-service',
    term: 'Deficiency in Service',
    category: 'tribunals_forums',
    definition:
      'A shortfall, imperfection, or inadequacy in the quality, nature, or manner of a service compared to what was promised or is required by law. It is one of the main grounds on which a consumer can file a complaint before a Consumer Commission.',
    example:
      'The complainant alleged deficiency in service, pointing out that the courier company had failed to deliver the consignment despite repeated assurances.',
  },
  {
    id: 'unfair-trade-practice',
    term: 'Unfair Trade Practice',
    category: 'tribunals_forums',
    definition:
      'A misleading or deceptive method used by a seller or service provider to promote or sell goods or services, such as false advertising or misrepresenting a product\'s quality. A consumer can complain about this before a Consumer Commission even without needing to show they suffered a further specific loss.',
    example:
      'The complaint alleged an unfair trade practice on the ground that the advertisement made false claims about the product\'s efficacy.',
  },
  {
    id: 'consumer-commission-hierarchy',
    term: 'District, State, and National Commission',
    category: 'tribunals_forums',
    definition:
      'The three-tier system of Consumer Commissions that hear consumer complaints, organised by the value of the claim. District Commissions handle claims up to ₹50 lakh, State Commissions handle claims between ₹50 lakh and ₹2 crore and appeals from District Commissions, and the National Commission handles claims above ₹2 crore and appeals from State Commissions.',
    example:
      'Since the claim exceeded ₹50 lakh, the complaint had to be filed before the State Commission rather than the District Commission.',
  },
  {
    id: 'special-leave-petition',
    term: 'Special Leave Petition',
    category: 'tribunals_forums',
    definition:
      'A petition filed before the Supreme Court, under Article 136 of the Constitution, asking for special permission to appeal against a judgment or order of any court or tribunal in the country. Because it requires the Supreme Court\'s discretionary permission first, it is a distinct step from an ordinary appeal, which is usually a right.',
    example:
      'The aggrieved party filed a Special Leave Petition under Article 136 before the Supreme Court against the High Court\'s judgment.',
    alsoKnownAs: ['SLP'],
  },

  // ─── Company Law ──────────────────────────────────────────────────
  {
    id: 'board-resolution',
    term: 'Board Resolution',
    category: 'company_law',
    definition:
      'A formal written decision passed by a company\'s board of directors at a duly convened meeting, recording their approval of a particular matter, such as opening a bank account, appointing an officer, or approving a transaction.',
    example:
      'The company passed a board resolution authorising the director to open a current account with the bank.',
  },
  {
    id: 'memorandum-of-association',
    term: 'Memorandum of Association',
    category: 'company_law',
    definition:
      'The foundational document filed at a company\'s incorporation that defines its name, registered office, objects or purpose, and the scope of activities it is permitted to carry out. A company generally cannot act outside what this document allows.',
    example:
      'The company\'s objects clause in its Memorandum of Association did not permit it to carry on the real estate business it had entered into.',
    alsoKnownAs: ['MOA'],
  },
  {
    id: 'articles-of-association',
    term: 'Articles of Association',
    category: 'company_law',
    definition:
      'The document that sets out the internal rules governing how a company is run, covering matters like the rights of shareholders, the powers of directors, and how meetings are conducted. It works alongside the Memorandum of Association but deals with internal management rather than the company\'s purpose.',
    example:
      'The Articles of Association provided that any transfer of shares required prior approval of the board.',
    alsoKnownAs: ['AOA'],
  },
  {
    id: 'share-transfer-deed',
    term: 'Share Transfer Deed',
    category: 'company_law',
    definition:
      'The prescribed form, Form SH-4, used to formally transfer shares of a company from one shareholder to another. It must be duly stamped and executed by both the transferor and the transferee before the company can register the transfer.',
    example:
      'The transferor executed the Share Transfer Deed in Form SH-4 and handed it over along with the share certificate to the transferee.',
    alsoKnownAs: ['SH-4'],
  },
  {
    id: 'llp-agreement',
    term: 'LLP Agreement',
    category: 'company_law',
    definition:
      'The agreement between the partners of a Limited Liability Partnership, and between the partners and the LLP itself, that sets out matters like each partner\'s capital contribution, profit-sharing ratio, and management rights and duties.',
    example:
      'The LLP Agreement fixed each partner\'s profit-sharing ratio at fifty percent.',
  },
  {
    id: 'registrar-of-companies',
    term: 'Registrar of Companies',
    category: 'company_law',
    definition:
      'The government officer, functioning under the Ministry of Corporate Affairs, responsible for registering companies and LLPs and for overseeing their ongoing compliance filings in a particular state or region.',
    example:
      'The company filed its annual return with the Registrar of Companies within the prescribed time.',
    alsoKnownAs: ['ROC'],
  },
  {
    id: 'director-identification-number',
    term: 'Director Identification Number',
    category: 'company_law',
    definition:
      'A unique identification number that every individual must obtain before being appointed as a director of a company in India. It stays with that person across all the companies they are a director of.',
    example:
      'Before his appointment as director, he obtained his Director Identification Number from the Ministry of Corporate Affairs.',
    alsoKnownAs: ['DIN'],
  },
  {
    id: 'winding-up',
    term: 'Winding Up',
    category: 'company_law',
    definition:
      'The legal process of closing down a company, by which its assets are collected, its debts are paid off, and any surplus is distributed among its shareholders, before the company is finally dissolved and removed from the register.',
    example:
      'Unable to pay its creditors, the company\'s board resolved to initiate winding up proceedings.',
  },
  {
    id: 'e-form',
    term: 'E-Form',
    category: 'company_law',
    definition:
      'An electronic form filed with the Registrar of Companies through the Ministry of Corporate Affairs online portal, used for routine compliance filings such as appointing a director, changing a registered office, or filing annual returns.',
    example:
      'The company filed the e-form intimating the change in its registered office with the Registrar of Companies.',
  },
  {
    id: 'statutory-register',
    term: 'Statutory Register',
    category: 'company_law',
    definition:
      'A record that a company is legally required to maintain, containing specific information such as its list of shareholders, directors, or charges on its assets. These registers must be kept up to date and are open to inspection in the circumstances the law allows.',
    example:
      'The company secretary was asked to produce the statutory register of members for inspection by the auditor.',
  },
  {
    id: 'annual-general-meeting',
    term: 'Annual General Meeting',
    category: 'company_law',
    definition:
      'A meeting that most companies are required to hold once every financial year, where shareholders review the company\'s annual accounts, approve dividends, and handle matters like appointing directors and auditors.',
    example:
      'The company held its Annual General Meeting to approve the audited accounts and declare a dividend.',
    alsoKnownAs: ['AGM'],
  },
  {
    id: 'extraordinary-general-meeting',
    term: 'Extraordinary General Meeting',
    category: 'company_law',
    definition:
      'Any meeting of a company\'s shareholders held other than the Annual General Meeting, called to decide on urgent or specific matters that cannot wait until the next annual meeting.',
    example:
      'The board called an Extraordinary General Meeting to seek shareholder approval for the proposed increase in share capital.',
    alsoKnownAs: ['EGM'],
  },
  {
    id: 'authorised-share-capital',
    term: 'Authorised Share Capital',
    category: 'company_law',
    definition:
      'The maximum value of shares that a company is permitted to issue to shareholders, as stated in its Memorandum of Association. A company must formally increase this limit before it can issue shares beyond it.',
    example:
      'The company increased its authorised share capital from ₹1 crore to ₹5 crore before issuing the fresh shares.',
  },
  {
    id: 'paid-up-share-capital',
    term: 'Paid-Up Share Capital',
    category: 'company_law',
    definition:
      'The actual amount of money shareholders have paid to the company in exchange for the shares issued to them so far. It can be less than the authorised share capital, which is simply the upper limit the company is allowed to issue.',
    example:
      'Although the authorised share capital was ₹1 crore, the company\'s paid-up share capital stood at only ₹60 lakh.',
  },
  {
    id: 'certificate-of-incorporation',
    term: 'Certificate of Incorporation',
    category: 'company_law',
    definition:
      'The official certificate issued by the Registrar of Companies confirming that a company has been legally formed and registered. A company legally comes into existence, as a separate entity from its founders, from the date on this certificate.',
    example:
      'The Registrar of Companies issued the certificate of incorporation, and the company came into existence from that date.',
  },
  {
    id: 'registered-office',
    term: 'Registered Office',
    category: 'company_law',
    definition:
      'The official address of a company on record with the Registrar of Companies, used for receiving legal notices and official communications. It need not be the company\'s main place of business, but the company must be able to receive communications there.',
    example:
      'All statutory notices to the company were sent to the address recorded as its registered office.',
  },

  // ─── Property Law ─────────────────────────────────────────────────
  {
    id: 'sale-deed',
    term: 'Sale Deed',
    category: 'property_law',
    definition:
      'The legal document that formally transfers ownership of an immovable property from a seller to a buyer in exchange for a price. It must be properly stamped and registered to be legally effective in transferring title.',
    example:
      'The buyer registered the sale deed at the sub-registrar\'s office after paying the applicable stamp duty.',
  },
  {
    id: 'gift-deed',
    term: 'Gift Deed',
    category: 'property_law',
    definition:
      'The legal document that transfers ownership of a property from one person to another voluntarily and without any payment in return. Like a sale deed, it must be properly stamped and registered to take legal effect.',
    example:
      'The father executed a gift deed transferring the house to his daughter without any consideration.',
  },
  {
    id: 'lease-deed',
    term: 'Lease Deed',
    category: 'property_law',
    definition:
      'The legal document that grants one person the right to occupy and use another person\'s property for an agreed period, in exchange for rent, without transferring ownership of the property itself.',
    example:
      'Under the lease deed, the tenant was granted the right to occupy the shop for five years at a monthly rent of ₹25,000.',
  },
  {
    id: 'mortgage-deed',
    term: 'Mortgage Deed',
    category: 'property_law',
    definition:
      'The legal document by which a property owner pledges their property as security for a loan or other debt, giving the lender certain rights over that property if the debt is not repaid, without necessarily giving up possession of it.',
    example:
      'The borrower executed a mortgage deed pledging his house as security for the loan sanctioned by the bank.',
  },
  {
    id: 'general-power-of-attorney',
    term: 'General Power of Attorney',
    category: 'property_law',
    definition:
      'A document authorising another person to act on someone\'s behalf across a broad range of matters, such as managing property, operating bank accounts, and handling legal affairs, rather than being limited to one specific task.',
    example:
      'Before leaving for abroad, the owner executed a General Power of Attorney authorising his brother to manage and lease out the property.',
    alsoKnownAs: ['GPA'],
  },
  {
    id: 'special-power-of-attorney',
    term: 'Special Power of Attorney',
    category: 'property_law',
    definition:
      'A document authorising another person to act on someone\'s behalf for one specific task or transaction only, such as selling a particular property, rather than for general affairs.',
    example:
      'The owner executed a Special Power of Attorney authorising his agent solely to sell the one plot described in it.',
    alsoKnownAs: ['SPA'],
  },
  {
    id: 'stamp-duty',
    term: 'Stamp Duty',
    category: 'property_law',
    definition:
      'A tax, usually a percentage of the property\'s value or the transaction amount, that must be paid to the state government when executing certain documents, such as a sale deed or lease deed. Without paying the correct stamp duty, such documents generally cannot be used as valid evidence in court or registered.',
    example:
      'The parties paid stamp duty at the applicable rate before presenting the sale deed for registration.',
  },
  {
    id: 'registration-of-document',
    term: 'Registration of Document',
    category: 'property_law',
    definition:
      'The formal process of recording a document, such as a sale deed or gift deed, with the government\'s sub-registrar office. Registration creates a public record of the transaction and, for many types of property documents, is legally required to make the transfer valid.',
    example:
      'Registration of the document at the sub-registrar\'s office was completed within four months of its execution, as required by law.',
  },
  {
    id: 'encumbrance',
    term: 'Encumbrance',
    category: 'property_law',
    definition:
      'A claim, liability, or restriction attached to a property, such as an outstanding mortgage or a pending legal dispute, that can affect the owner\'s ability to freely sell or transfer it.',
    example:
      'A search of the records revealed an encumbrance on the property in the form of an existing mortgage in favour of the bank.',
  },
  {
    id: 'title-deed',
    term: 'Title Deed',
    category: 'property_law',
    definition:
      'A document that serves as legal proof of a person\'s ownership of a property, such as a sale deed or a gift deed in their name. It is checked to confirm who legally owns a property before any transaction involving it.',
    example:
      'The buyer\'s lawyer examined the title deed to confirm that the seller had clear and marketable title to the property.',
  },
  {
    id: 'consideration-in-a-deed',
    term: 'Consideration',
    category: 'property_law',
    definition:
      'The price, payment, or benefit exchanged for a property or right transferred under a deed, such as the sale price paid for a property. A deed must clearly state the consideration involved, or, in the case of a gift deed, state clearly that no consideration was given.',
    example:
      'The sale deed recorded the consideration as ₹45,00,000, paid by the buyer to the seller before execution.',
  },
  {
    id: 'encumbrance-certificate',
    term: 'Encumbrance Certificate',
    category: 'property_law',
    definition:
      'An official certificate issued by the sub-registrar\'s office confirming whether a property has any recorded encumbrances, such as mortgages or pending liabilities, during a specified period. It is commonly checked before buying property to confirm the seller has a clear, marketable title.',
    example:
      'The buyer obtained an encumbrance certificate for the preceding thirteen years before finalising the purchase.',
  },
  {
    id: 'mutation-of-property',
    term: 'Mutation',
    category: 'property_law',
    definition:
      'The process of updating government revenue records to reflect a change in the ownership of a property, such as after a sale or inheritance. Mutation does not itself transfer ownership, which happens through the sale deed or other document, but it keeps the official land records current for purposes like property tax.',
    example:
      'After the sale was registered, the buyer applied for mutation of the property in the municipal records.',
  },
  {
    id: 'easement',
    term: 'Easement',
    category: 'property_law',
    definition:
      'A right that the owner of one property has to use another person\'s neighbouring property for a limited purpose, such as a right of way to access a road, or a right to receive light or air.',
    example:
      'The owner of the inner plot claimed an easement of right of way over the neighbouring property to access the main road.',
  },
  {
    id: 'lien',
    term: 'Lien',
    category: 'property_law',
    definition:
      'The right of a person who holds someone else\'s property, or is owed money in connection with it, to retain possession of that property until the debt or claim is settled.',
    example:
      'The workshop exercised a lien over the car, refusing to release it until the repair charges were paid.',
  },
  {
    id: 'conveyance',
    term: 'Conveyance',
    category: 'property_law',
    definition:
      'The general legal term for transferring ownership of property from one person to another, and also used for the document, such as a sale deed, that carries out that transfer.',
    example:
      'Conveyance of the property in the buyer\'s favour was completed once the sale deed was registered.',
  },
  {
    id: 'relinquishment-deed',
    term: 'Relinquishment Deed',
    category: 'property_law',
    definition:
      'A document by which a co-owner of a property gives up their share in it in favour of one or more of the other co-owners, most commonly used to settle inherited family property among relatives.',
    example:
      'One brother executed a relinquishment deed giving up his share in the ancestral house in favour of his siblings.',
  },

  // ─── Latin Maxims ─────────────────────────────────────────────────
  {
    id: 'res-judicata',
    term: 'Res Judicata',
    category: 'latin_maxims',
    definition:
      'A rule that stops a matter from being litigated again once a competent court has already finally decided it between the same parties. It prevents endless re-litigation of issues that have already been conclusively resolved.',
    example:
      'The court dismissed the second suit as barred by res judicata, since the same issue between the same parties had already been finally decided.',
  },
  {
    id: 'sub-judice',
    term: 'Sub Judice',
    category: 'latin_maxims',
    definition:
      'A matter that is currently pending before a court and has not yet been decided. Publicly commenting on or prejudging a sub judice matter can sometimes amount to contempt of court.',
    example:
      'Since the matter was sub judice, the channel was cautioned against broadcasting any further comment on the allegations.',
  },
  {
    id: 'ultra-vires',
    term: 'Ultra Vires',
    category: 'latin_maxims',
    definition:
      'An act done beyond the legal power or authority of the person or body doing it, such as a company acting outside the objects stated in its Memorandum of Association, or a government authority exceeding the powers granted to it by law. An ultra vires act is generally treated as invalid.',
    example:
      'The shareholders challenged the transaction as ultra vires the company\'s Memorandum of Association.',
  },
  {
    id: 'mens-rea',
    term: 'Mens Rea',
    category: 'latin_maxims',
    definition:
      'The guilty mental state, such as intention or knowledge, that a person must generally have had while committing an act for it to count as a crime. Most criminal offences require the prosecution to prove both the guilty act and this guilty mind.',
    example:
      'The defence argued that the accused lacked the mens rea necessary to constitute the offence.',
  },
  {
    id: 'actus-reus',
    term: 'Actus Reus',
    category: 'latin_maxims',
    definition:
      'The physical act or conduct that makes up a crime, as distinct from mens rea, the mental state behind it. Most crimes require the prosecution to prove that the accused actually committed this guilty act.',
    example:
      'The prosecution had to establish both the actus reus and the accompanying guilty mind to secure a conviction.',
  },
  {
    id: 'audi-alteram-partem',
    term: 'Audi Alteram Partem',
    category: 'latin_maxims',
    definition:
      'The principle that no one should be judged or penalised without first being given a fair chance to be heard and to present their side. It is one of the core rules of natural justice followed by courts and tribunals.',
    example:
      'The order was set aside for violating audi alteram partem, having been passed without giving the petitioner any opportunity to respond.',
  },
  {
    id: 'caveat-emptor',
    term: 'Caveat Emptor',
    category: 'latin_maxims',
    definition:
      'The principle that a buyer is responsible for checking the quality and condition of what they are buying before completing the purchase. Its application has been narrowed significantly in India by consumer protection law, which places obligations on sellers as well.',
    example:
      'The seller invoked caveat emptor, pointing out that the buyer had personally inspected the machinery before signing the purchase order.',
  },
  {
    id: 'bona-fide',
    term: 'Bona Fide',
    category: 'latin_maxims',
    definition:
      'Done honestly, in good faith, and without any intention to deceive. Courts often look at whether a party\'s conduct was bona fide when deciding disputes, especially where honesty or genuine belief affects the outcome.',
    example:
      'The court found that the purchaser had acted bona fide and had no knowledge of the earlier, unregistered agreement.',
  },
  {
    id: 'mala-fide',
    term: 'Mala Fide',
    category: 'latin_maxims',
    definition:
      'Done in bad faith, with a dishonest or improper motive, as opposed to bona fide conduct. An action taken mala fide, such as an official decision made to settle a personal grudge, can be struck down by a court even if it was technically within that person\'s power.',
    example:
      'The petitioner alleged that the transfer order had been passed mala fide, to settle a personal score with him.',
  },
  {
    id: 'prima-facie',
    term: 'Prima Facie',
    category: 'latin_maxims',
    definition:
      'On the face of it, or based on a first look at the available material, before the matter is fully examined in detail. A court often needs to be satisfied there is a prima facie case before taking certain steps, such as issuing notice or granting an interim order.',
    example:
      'Satisfied that a prima facie case existed, the court issued notice to the respondents and granted an interim stay.',
  },
  {
    id: 'suo-motu',
    term: 'Suo Motu',
    category: 'latin_maxims',
    definition:
      'An action a court or authority takes on its own initiative, without anyone having filed a formal request or complaint asking it to act.',
    example:
      'The High Court took suo motu cognizance of the news report and registered the matter as a public interest litigation.',
  },
  {
    id: 'obiter-dicta',
    term: 'Obiter Dicta',
    category: 'latin_maxims',
    definition:
      'Remarks or observations made by a judge in a judgment that are not essential to deciding the case, as distinct from the ratio decidendi, the reasoning that actually forms the binding part of the decision. Obiter dicta can be persuasive in later cases but are not binding as precedent.',
    example:
      'Counsel argued that the observation relied upon by the other side was mere obiter dicta and not binding on the court.',
  },
  {
    id: 'ratio-decidendi',
    term: 'Ratio Decidendi',
    category: 'latin_maxims',
    definition:
      'The core legal reasoning and principle that a court relies on to reach its decision in a case, as distinct from obiter dicta, which are incidental remarks. It is this reasoning, not every statement in the judgment, that forms the binding precedent for later cases.',
    example:
      'The bench clarified that only the ratio decidendi of the earlier judgment was binding, not every incidental remark in it.',
  },
  {
    id: 'ab-initio',
    term: 'Ab Initio',
    category: 'latin_maxims',
    definition:
      'From the very beginning. It is often used to describe something, such as a contract or an appointment, that is treated as invalid or void from the moment it was created, rather than only from when a court later declared it so.',
    example:
      'The court held the agreement void ab initio, as it had been entered into for an unlawful purpose from the outset.',
  },
  {
    id: 'in-personam',
    term: 'In Personam',
    category: 'latin_maxims',
    definition:
      'A right or a court order that is directed against a specific person, binding only on that person, as opposed to a right in rem, which is directed against the world at large.',
    example:
      'Being a decree in personam, the order bound only the defendant and not third parties claiming through him.',
  },
  {
    id: 'in-rem',
    term: 'In Rem',
    category: 'latin_maxims',
    definition:
      'A right or a court order concerning a thing, such as a property or status, that is binding on the world at large, as opposed to a right in personam, which binds only a specific person.',
    example:
      'A decree of divorce operates in rem, affecting the status of the parties as against the whole world.',
  },
  {
    id: 'per-incuriam',
    term: 'Per Incuriam',
    category: 'latin_maxims',
    definition:
      'A decision given through lack of care, typically because the court overlooked a binding precedent or a relevant statutory provision it should have applied. A judgment found to be per incuriam is not treated as binding precedent on that point.',
    example:
      'Counsel urged that the earlier decision was per incuriam, since it had failed to consider a binding judgment of a larger bench.',
  },
  {
    id: 'stare-decisis',
    term: 'Stare Decisis',
    category: 'latin_maxims',
    definition:
      'The principle that courts should follow the precedents set by earlier decisions, especially those of higher courts, rather than deciding each similar case afresh. It promotes consistency and predictability in how the law is applied.',
    example:
      'Applying the principle of stare decisis, the court followed the view taken by the coordinate bench in an earlier matter.',
  },
  {
    id: 'habeas-corpus',
    term: 'Habeas Corpus',
    category: 'latin_maxims',
    definition:
      'A writ issued under Article 32 or Article 226 of the Constitution, directing a person or authority holding someone in custody to produce that person before the court and justify the detention. It is the primary remedy against unlawful or arbitrary detention.',
    example:
      'The family filed a habeas corpus petition under Article 226 before the High Court, seeking production of the detained person before the court.',
  },
  {
    id: 'mandamus',
    term: 'Mandamus',
    category: 'latin_maxims',
    definition:
      'A writ issued under Article 32 or Article 226 of the Constitution, directing a public authority or official to perform a public duty it has failed or refused to perform.',
    example:
      'The petitioner sought a writ of mandamus under Article 226 directing the municipal authority to process his pending application.',
  },
  {
    id: 'certiorari',
    term: 'Certiorari',
    category: 'latin_maxims',
    definition:
      'A writ issued under Article 32 or Article 226 of the Constitution, by which a higher court calls for the record of a case from a lower court or tribunal and quashes its order if it was passed without jurisdiction or in violation of natural justice.',
    example:
      'The petitioner sought a writ of certiorari under Article 226 to quash the order passed by the tribunal without jurisdiction.',
  },
  {
    id: 'quo-warranto',
    term: 'Quo Warranto',
    category: 'latin_maxims',
    definition:
      'A writ issued under Article 32 or Article 226 of the Constitution, questioning the authority by which a person holds a public office, and removing them from it if they are found to be occupying it without legal right.',
    example:
      'A writ of quo warranto was sought under Article 226, questioning the authority under which the respondent continued to hold the public office.',
  },
  {
    id: 'amicus-curiae',
    term: 'Amicus Curiae',
    category: 'latin_maxims',
    definition:
      'A person or organisation, not a party to a case, whom a court permits to assist it by offering information, expertise, or arguments relevant to the case, usually on a matter of public importance.',
    example:
      'The court appointed a senior advocate as amicus curiae to assist it on the question of law involved.',
  },
  {
    id: 'de-facto',
    term: 'De Facto',
    category: 'latin_maxims',
    definition:
      'Existing in practice or fact, whether or not it is formally or legally recognised. Often contrasted with "de jure," which means existing by law.',
    example:
      'Although never formally appointed, he had been functioning as the de facto director of the company for over a year.',
  },
  {
    id: 'de-jure',
    term: 'De Jure',
    category: 'latin_maxims',
    definition:
      'Existing by law or as a matter of legal right, whether or not it reflects what is actually happening in practice. Often contrasted with "de facto," which means existing in fact.',
    example:
      'While another person managed daily operations, the original allottee remained the de jure owner of the plot.',
  },
  {
    id: 'inter-alia',
    term: 'Inter Alia',
    category: 'latin_maxims',
    definition:
      'Among other things. Used to indicate that a list or statement is not exhaustive — that other matters exist besides the ones specifically mentioned.',
    example:
      'The notice stated, inter alia, that the licence would be reviewed if the violations continued.',
  },
  {
    id: 'ipso-facto',
    term: 'Ipso Facto',
    category: 'latin_maxims',
    definition:
      'By that very fact itself, without anything more being needed to bring about a particular result or consequence.',
    example:
      'The lease did not, ipso facto, come to an end merely because the tenant changed the nature of his business.',
  },
  {
    id: 'quid-pro-quo',
    term: 'Quid Pro Quo',
    category: 'latin_maxims',
    definition:
      'Something given or done in exchange for something else of comparable value. Used, for example, in contract law to describe consideration passing between the parties to an agreement.',
    example:
      'The agreement recorded a clear quid pro quo: possession of the shop in exchange for the agreed monthly rent.',
  },
  {
    id: 'status-quo',
    term: 'Status Quo',
    category: 'latin_maxims',
    definition:
      'The existing state of affairs at a given point in time. Courts often pass interim orders to "maintain status quo," preventing any party from changing the existing situation while a case is pending.',
    example:
      'The court directed the parties to maintain status quo with respect to the disputed property until the next hearing.',
  },
  {
    id: 'pari-passu',
    term: 'Pari Passu',
    category: 'latin_maxims',
    definition:
      'On equal footing, without preference. Used mainly where creditors or claimants are paid or treated proportionately, with none given priority over the others.',
    example:
      'The resolution plan provided that all similarly placed operational creditors would be paid pari passu.',
  },
  {
    id: 'res-ipsa-loquitur',
    term: 'Res Ipsa Loquitur',
    category: 'latin_maxims',
    definition:
      'The thing speaks for itself. Applied mainly in negligence cases, where the circumstances of an accident are so obviously indicative of carelessness that the facts alone are treated as evidence of negligence, without needing further proof of exactly how it happened.',
    example:
      'The plaintiff invoked res ipsa loquitur, arguing that a surgical instrument left inside the body after the operation spoke for itself.',
  },
  {
    id: 'ejusdem-generis',
    term: 'Ejusdem Generis',
    category: 'latin_maxims',
    definition:
      'A rule of statutory interpretation: where a law lists specific items followed by general words, those general words are read as limited to things of the same kind as the items listed, not as covering anything whatsoever.',
    example:
      'Applying the rule of ejusdem generis, the court held that the general words following a list of specific weapons covered only weapons of a similar kind.',
  },
  {
    id: 'noscitur-a-sociis',
    term: 'Noscitur a Sociis',
    category: 'latin_maxims',
    definition:
      'A rule of statutory interpretation: the meaning of an unclear word or phrase in a law can be understood by looking at the words surrounding it, since a word is known by the company it keeps.',
    example:
      'The court construed the disputed word by applying noscitur a sociis, reading it in light of the words immediately surrounding it in the provision.',
  },
  {
    id: 'doli-incapax',
    term: 'Doli Incapax',
    category: 'latin_maxims',
    definition:
      'Incapable of committing a crime. Used mainly for young children, who are presumed by law to lack the understanding needed to be held criminally responsible for their actions below a certain age.',
    example:
      'Being barely seven years old, the child was held doli incapax and could not be held criminally liable for the act.',
  },
  {
    id: 'uberrima-fides',
    term: 'Uberrima Fides',
    category: 'latin_maxims',
    definition:
      'Utmost good faith. Certain contracts, most notably insurance contracts, require each party to voluntarily disclose all material facts to the other, going beyond the ordinary duty not to misrepresent that applies to most contracts.',
    example:
      'The insurer repudiated the claim on the ground that the policyholder had breached the duty of uberrima fides by concealing a pre-existing illness.',
  },
  {
    id: 'de-novo',
    term: 'De Novo',
    category: 'latin_maxims',
    definition:
      'Anew, or starting afresh. A "de novo" hearing or trial means the matter is heard again from the beginning, as if the earlier proceeding had not taken place, rather than merely being reviewed for errors.',
    example:
      'The appellate authority set aside the order and directed the assessing officer to conduct the hearing de novo.',
  },
  {
    id: 'functus-officio',
    term: 'Functus Officio',
    category: 'latin_maxims',
    definition:
      'Having discharged one\'s duty or authority, and therefore no longer having the power to act further in the matter. For example, a court that has already passed a final decree is, on most matters, functus officio in relation to that case.',
    example:
      'Once the tribunal had signed and pronounced the award, it became functus officio and could not modify it further.',
  },
  {
    id: 'sui-generis',
    term: 'Sui Generis',
    category: 'latin_maxims',
    definition:
      'Of its own kind, or unique — not fitting neatly into an existing category or classification, and therefore requiring its own distinct legal treatment.',
    example:
      'The court observed that the statutory body created under the special Act was sui generis and could not simply be equated with an ordinary company.',
  },
  {
    id: 'lis-pendens',
    term: 'Lis Pendens',
    category: 'latin_maxims',
    definition:
      'A pending suit or litigation. Under the doctrine of lis pendens, a property that is the subject matter of an ongoing case cannot be transferred in a way that affects the rights of the other party to that case.',
    example:
      'Relying on the doctrine of lis pendens, the court held that a sale made during the pendency of the suit could not defeat the plaintiff\'s rights.',
  },
  {
    id: 'pendente-lite',
    term: 'Pendente Lite',
    category: 'latin_maxims',
    definition:
      'While the litigation is pending. Used to describe an order, right, or arrangement, such as interim maintenance or custody, that applies only for the duration of the case until it is finally decided.',
    example:
      'The wife was granted maintenance pendente lite to meet her expenses during the pendency of the matrimonial proceedings.',
  },
  {
    id: 'ex-post-facto',
    term: 'Ex Post Facto',
    category: 'latin_maxims',
    definition:
      'After the fact. Most often used for a law that seeks to criminalise an act, or increase the punishment for it, with effect from before the date the law itself was made — something the Constitution generally prohibits in criminal matters.',
    example:
      'The court struck down the provision insofar as it sought to impose ex post facto criminal liability for conduct that was lawful when done.',
  },
  {
    id: 'nunc-pro-tunc',
    term: 'Nunc Pro Tunc',
    category: 'latin_maxims',
    definition:
      'Now for then. An order that a court makes now but which takes legal effect from an earlier date, typically used to correct the record where a delay or omission would otherwise unfairly affect a party\'s rights.',
    example:
      'Noticing the clerical omission, the court passed a nunc pro tunc order correcting the date recorded in the earlier decree.',
  },
  {
    id: 'quantum-meruit',
    term: 'Quantum Meruit',
    category: 'latin_maxims',
    definition:
      'As much as one has earned. A claim for reasonable payment for work done or services provided, made when no fixed price was agreed, or when a contract could not be completed, rather than a claim for damages.',
    example:
      'Since the contract was terminated midway, the contractor claimed payment on a quantum meruit basis for the work already completed.',
  },
  {
    id: 'bona-vacantia',
    term: 'Bona Vacantia',
    category: 'latin_maxims',
    definition:
      'Ownerless property. Property with no identifiable owner, such as the assets of a dissolved company or of a person who dies without heirs or a will, which by law passes to the government.',
    example:
      'On the company\'s dissolution, its unclaimed assets passed to the government as bona vacantia.',
  },
  {
    id: 'modus-operandi',
    term: 'Modus Operandi',
    category: 'latin_maxims',
    definition:
      'A particular method or pattern of operating. In criminal matters, it refers to the characteristic way in which an offence is carried out, which can sometimes help link an accused to similar past offences.',
    example:
      'The investigating officer noted that the modus operandi in this case matched that of two earlier burglaries in the same locality.',
  },
  {
    id: 'coram-non-judice',
    term: 'Coram Non Judice',
    category: 'latin_maxims',
    definition:
      'Before a person who is not a judge, or before a court that lacks the authority to hear the matter. An order passed coram non judice is treated as a nullity, since it was made without proper jurisdiction to begin with.',
    example:
      'The order was declared a nullity as coram non judice, having been passed by an officer who had no authority to adjudicate the matter.',
  },
  {
    id: 'mutatis-mutandis',
    term: 'Mutatis Mutandis',
    category: 'latin_maxims',
    definition:
      'With the necessary changes having been made. Used when applying a rule, clause, or provision written for one situation to another, similar situation, adjusting only the details that must necessarily differ.',
    example:
      'The rules applicable to the head office were directed to apply mutatis mutandis to the branch offices as well.',
  },
  {
    id: 'sine-die',
    term: 'Sine Die',
    category: 'latin_maxims',
    definition:
      'Without a fixed date for resuming. A hearing or matter adjourned "sine die" is postponed indefinitely, with no specific date set for when it will next be taken up.',
    example:
      'With both counsel absent, the hearing was adjourned sine die.',
  },
  {
    id: 'sine-qua-non',
    term: 'Sine Qua Non',
    category: 'latin_maxims',
    definition:
      'An essential condition, without which something cannot happen or exist. Used to describe a requirement that is absolutely indispensable to a particular outcome.',
    example:
      'Proper service of notice on the defendant is a sine qua non for passing a valid ex parte decree.',
  },
  {
    id: 'nemo-judex-in-causa-sua',
    term: 'Nemo Judex in Causa Sua',
    category: 'latin_maxims',
    definition:
      'No one should be a judge in his own cause. A core principle of natural justice requiring that a person or authority deciding a matter must not have a personal interest in its outcome.',
    example:
      'The officer recused himself from the inquiry, mindful of the principle of nemo judex in causa sua, since he was personally involved in the dispute.',
  },
  {
    id: 'volenti-non-fit-injuria',
    term: 'Volenti Non Fit Injuria',
    category: 'latin_maxims',
    definition:
      'To a willing person, no injury is done. A defence, mainly in tort law, that a person who knowingly and voluntarily accepted the risk of harm cannot later claim compensation for that harm.',
    example:
      'The organisers pleaded volenti non fit injuria, arguing that the spectator had voluntarily accepted the risk of injury by choosing to stand near the track.',
  },
];
