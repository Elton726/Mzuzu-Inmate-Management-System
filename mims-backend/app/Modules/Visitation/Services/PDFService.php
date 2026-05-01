<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Visitation\Models\VisitationSession;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Storage;

class PDFService
{
    public function generateCharityRequestPdf(VisitationSession $session): string
    {
        $view = view('visitation.charity_pdf', ['session' => $session])->render();
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($view);
        $dompdf->setPaper('a4', 'portrait');
        $dompdf->render();

        $filename = sprintf(
            'charity_pdfs/charity_visit_%d_%s.pdf',
            $session->id,
            now()->format('YmdHis')
        );

        Storage::disk('public')->put($filename, $dompdf->output());

        return $filename;
    }
}
